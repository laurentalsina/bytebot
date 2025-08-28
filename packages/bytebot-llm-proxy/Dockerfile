FROM ghcr.io/berriai/litellm:main-stable

# Add custom config into the image
COPY ./bytebot-llm-proxy/litellm-config.yaml /app/config.yaml
COPY ./bytebot-llm-proxy/fra-ai-testing-noprod-3b9aacb75836.json /app/fra-ai-testing-noprod-3b9aacb75836.json
CMD ["--config", "/app/config.yaml", "--port", "4000"]
