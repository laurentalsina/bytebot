import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIUserAbortError } from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ToolResultContentBlock,
  ImageContentBlock,
  isUserActionContentBlock,
  isComputerToolUseContentBlock,
  isImageContentBlock,
  ThinkingContentBlock,
} from '@bytebot/shared';
import { Message, Role } from '@prisma/client';
import { proxyTools } from './proxy.tools';
import {
  BytebotAgentService,
  BytebotAgentInterrupt,
  BytebotAgentResponse,
} from '../agent/agent.types';

@Injectable()
export class ProxyService implements BytebotAgentService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly configService: ConfigService) {
    const proxyUrl = this.configService.get<string>('BYTEBOT_LLM_PROXY_URL');

    if (!proxyUrl) {
      this.logger.warn(
        'BYTEBOT_LLM_PROXY_URL is not set. ProxyService will not work properly.',
      );
    }

    // Initialize OpenAI client with proxy configuration
    this.openai = new OpenAI({
      apiKey: 'dummy-key-for-proxy',
      baseURL: proxyUrl,
    });
  }

  /**
   * Main method to generate messages using the Chat Completions API
   */
  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    // Convert messages to Chat Completion format
    const chatMessages = this.formatMessagesForChatCompletion(
      systemPrompt,
      messages,
    );
    try {
      // Prepare the Chat Completion request
      const completionRequest: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: chatMessages,
        max_tokens: 8192,
        ...(useTools && { tools: proxyTools }),
        reasoning_effort: 'high',
      };

      // Make the API call
      const completion = await this.openai.chat.completions.create(
        completionRequest,
        { signal },
      );

      // Process the response
      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No valid response from Chat Completion API');
      }

      // Convert response to MessageContentBlocks
      const contentBlocks = this.formatChatCompletionResponse(choice.message);

      return {
        contentBlocks,
        tokenUsage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      if (error instanceof APIUserAbortError) {
        this.logger.log('Chat Completion API call aborted');
        throw new BytebotAgentInterrupt();
      }

      this.logger.error(
        `Error sending message to proxy: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Convert Bytebot messages to Chat Completion format
   */
  private formatMessagesForChatCompletion(
    systemPrompt: string,
    messages: Message[],
  ): ChatCompletionMessageParam[] {
    const chatMessages: ChatCompletionMessageParam[] = [];

    chatMessages.push({
      role: 'system',
      content: systemPrompt,
    });

    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

      // Group blocks by role and message
      if (message.role === Role.USER) {
        const contentParts: ChatCompletionContentPart[] = [];
        for (const block of messageContentBlocks) {
          if (block.type === MessageContentType.Text) {
            contentParts.push({ type: 'text', text: block.text });
          } else if (block.type === MessageContentType.Image) {
            const imageBlock = block as ImageContentBlock;
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${imageBlock.source.media_type};base64,${imageBlock.source.data}`,
                detail: 'high',
              },
            });
          } else if (isUserActionContentBlock(block)) {
            const userActionBlocks = block.content;
            for (const actionBlock of userActionBlocks) {
              if (isComputerToolUseContentBlock(actionBlock)) {
                contentParts.push({
                  type: 'text',
                  text: `User performed action: ${actionBlock.name}\n${JSON.stringify(actionBlock.input, null, 2)}`,
                });
              } else if (isImageContentBlock(actionBlock)) {
                contentParts.push({
                  type: 'image_url',
                  image_url: {
                    url: `data:${actionBlock.source.media_type};base64,${actionBlock.source.data}`,
                    detail: 'high',
                  },
                });
              }
            }
          }
        }
        if (contentParts.length > 0) {
          chatMessages.push({ role: 'user', content: contentParts });
        }
      } else if (message.role === Role.ASSISTANT) {
        const textParts: string[] = [];
        const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];

        for (const block of messageContentBlocks) {
          if (block.type === MessageContentType.Text) {
            textParts.push(block.text);
          } else if (block.type === MessageContentType.Thinking) {
            textParts.unshift(`Thinking: ${block.thinking}`);
          } else if (block.type === MessageContentType.ToolUse) {
            const toolBlock = block as ToolUseContentBlock;
            toolCalls.push({
              id: toolBlock.id,
              type: 'function',
              function: {
                name: toolBlock.name,
                arguments: JSON.stringify(toolBlock.input),
              },
            });
          }
        }

        const assistantMessage: OpenAI.Chat.ChatCompletionAssistantMessageParam =
          {
            role: 'assistant',
            content: textParts.length > 0 ? textParts.join('\n') : null,
          };

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }

        if (assistantMessage.content || (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0)) {
          chatMessages.push(assistantMessage);
        }
      }

      // Tool results are always in their own message, but they are associated with a message.
      // The current structure seems to have them inside other messages, which is weird.
      // Let's process them separately after processing the main message blocks.
      for (const block of messageContentBlocks) {
        if (block.type === MessageContentType.ToolResult) {
          const toolResultBlock = block as ToolResultContentBlock;
          const textParts = toolResultBlock.content
            .filter((c) => c.type === MessageContentType.Text)
            .map((c: TextContentBlock) => c.text);

          const images = toolResultBlock.content.filter(
            (c) => c.type === MessageContentType.Image,
          ) as ImageContentBlock[];

          // Create the tool message with only text content
          chatMessages.push({
            role: 'tool',
            tool_call_id: toolResultBlock.tool_use_id,
            content: textParts.join('\n') || 'Tool executed successfully.',
          });

          // If there are images, create a new user message for them
          if (images.length > 0) {
            const contentParts: ChatCompletionContentPart[] = [];
            contentParts.push({type: 'text', text: 'The tool returned the following screenshot(s):'});
            images.forEach(image => {
                contentParts.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${image.source.media_type};base64,${image.source.data}`,
                        detail: 'high',
                    }
                });
            });
            chatMessages.push({
                role: 'user',
                content: contentParts
            });
          }
        }
      }
    }
    return chatMessages;
  }

  /**
   * Convert Chat Completion response to MessageContentBlocks
   */
  private formatChatCompletionResponse(
    message: OpenAI.Chat.ChatCompletionMessage,
  ): MessageContentBlock[] {
    const contentBlocks: MessageContentBlock[] = [];

    // Handle text content
    if (message.content) {
      contentBlocks.push({
        type: MessageContentType.Text,
        text: message.content,
      } as TextContentBlock);
    }

    if (message['reasoning_content']) {
      contentBlocks.push({
        type: MessageContentType.Thinking,
        thinking: message['reasoning_content'],
        signature: message['reasoning_content'],
      } as ThinkingContentBlock);
    }

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          let parsedInput = {};
          try {
            parsedInput = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            this.logger.warn(
              `Failed to parse tool call arguments: ${toolCall.function.arguments}`,
            );
            parsedInput = {};
          }

          contentBlocks.push({
            type: MessageContentType.ToolUse,
            id: toolCall.id,
            name: toolCall.function.name,
            input: parsedInput,
          } as ToolUseContentBlock);
        }
      }
    }

    // Handle refusal
    if (message.refusal) {
      contentBlocks.push({
        type: MessageContentType.Text,
        text: `Refusal: ${message.refusal}`,
      } as TextContentBlock);
    }

    return contentBlocks;
  }
}
