# Use the official Deno image
FROM denoland/deno:latest

WORKDIR /src

# Copy your application files into the container
COPY . .

# Pre-cache dependencies (optional but recommended)
RUN deno cache main.ts

# Expose the port Render will use (usually provided via an env var)
EXPOSE 8000

# Start the Deno app with the required permission
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]
