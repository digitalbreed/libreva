# LibreVA: Indie Game Voice Acting Toolkit

LibreVA is a self-hosted, open-source platform for generating high-quality voice acting for indie games. It provides a web interface for managing projects and voices, and a powerful text-to-speech backend based on [Chatterbox TTS](https://github.com/resemble-ai/chatterbox), both containerized using Docker.

![LibreVA Screenshot](https://github.com/user-attachments/assets/7b99f635-4eb9-4a7c-8e77-830efa4130ca)

**⚠️ Important:** For best performance, you need Windows 10 or 11 with WSL2 (Windows Subsystem for Linux) and a recent CUDA capable graphics card (NVIDIA RTX 3060 or better recommended). Other GPU acceleration [isn't possible in a Dockerized environment](https://docs.docker.com/desktop/features/gpu/), but a fall-back option to CPU is available.

## 🚀 Quick Start

1. **Clone the repository:**
    ```bash
    git clone git@github.com:digitalbreed/libreva.git
    cd libreva
    ```
2. **Start the application with Docker Compose:**
   If you are on WSL2 with CUDA support, run:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
    ```
    If you are on a different system, run:
    ```bash
    TTS_DEVICE=cpu docker compose up --build
    ```
    On first start, several dependencies and approximately 2 GB of model files will be downloaded automatically. This may take several minutes depending on your internet connection.
3. **Access the app:**
   Open [http://localhost:3000/libreva](http://localhost:3000/libreva) in your browser.
4. **Upload a voice sample:**
    - (This step is optional; if you don't have a sample, you can use the built-in default voice for testing.)
    - Click the "Add Voice" button on the homepage or the "Voices" sidebar menu item.
    - Click "Add Voice" on the voices screen and select "Upload Voice".
    - Follow the instructions to upload voice sample WAV file. Use 10-20 seconds of good quality for best results.
5. **Create a project:**
    - Click "Create Project" and enter a name for your project. Projects hold your generated speech files.
6. **Convert text to speech:**
    - Open your project, enter some text, select a voice, and click "Generate" to create a voice acting audio file.

## 🎚️ Text To Speech Settings

You can configure the default TTS exaggeration and temperature. Please see the [Chatterbox documentation](https://github.com/resemble-ai/chatterbox#tips) for more information.

LibreVA supports changing these values in the middle of a speech line, as well as inserting breaks, using these markers:

- `<p=N>` for pause in milliseconds
- `<e=N>` for exaggeration value (0 to 2)
- `<t=N>` for temperature value (0 to 1)

## 🔊 Voice Packs

LibreVA supports uploading zip archives containing multiple voice samples and metadata, called voice packs.

You can create your own voice pack by creating a zip file containing a `voices.json` file with the following structure:

```
{
    "version": "1.0.0",
    "author": "Your Name <your@email.com>",
    "repository": "https://github.com/yourname/your-repository",
    "base": "voices",
    "voices": [
        {
            "name": "Speaker Name",
            "notes": "Some notes describing the voice to ease discoverability.",
            "gender": "female",
            "file_name": "A-female-voice.wav",
            "tags": ["american", "female", "clear", "calm"]
        },
		...
    ]
}

```

When importing, LibreVA searches for the `voices.json` file in the root and on the first level of a zip archive. This allows for zip file download from GitHub repositories, where the content is stored in a directory with the name of the repository.

All properties except for the `voices` array are optional.

The `base` attribute is a directory name relative to the location of `voices.json`. This allows storing the WAV files in a sub-directory.

The `gender` attribute can be `"male"`, `"female"`, `null`, or omitted entirely.

The `tags` attribute can be omitted entirely.

## 🏗️ Architecture

LibreVA consists of two main services, orchestrated via Docker Compose:

### 1. `libreva-web`

- **Purpose:** The Next.js web frontend and API server. Manages projects, voices, and user interface.
- **Build:** Built from `Dockerfile.web` (production) or `Dockerfile.web.dev` (development).
- **Ports:** Exposes port 3000 by default.
- **Data:** Mounts the `/data` directory for database, voices, and outputs.

### 2. `libreva-tts`

- **Purpose:** The TTS backend, running Chatterbox TTS for voice synthesis and waveform generation.
- **Build:** Built from `tts_service/Dockerfile`.
- **Ports:** Exposes port 3100 internally for API calls from `libreva-web`.
- **Data:** Mounts the `/data` directory for model files.

## 📁 The `/data` Folder

The `/data`/ folder is the central storage location for all persistent data:

- `db/` — SQLite database for projects, voices, and outputs
- `voices/` — Voice samples and their waveform images (`<voiceId>.wav` and `<voiceId>.png`)
- `outputs/` — Generated audio outputs and their waveform images, organized by project (`<projectId>/<outputId>.wav` and `<projectId>/<outputId>.png`)
- `model/` — Chatterbox TTS model files

On first start, the [`start_tts.sh`](tts_service/start_tts.sh) script in `libreva-tts`downloads all required model files (ca. 2 GB) into `/data/model` if missing.
The `libreva-tts` service defers initialization until all files are downloaded.

## 🗑️ Resetting the Database

To reset all data (including projects, voices, and outputs):

1. Stop the application:
    ```bash
    docker compose down
    ```
2. Delete the database and all generated data:
    ```bash
    rm -rf data/db/* data/voices/* data/outputs/* data/waveforms/*
    ```
3. Restart the application:
    ```bash
    docker compose up --build
    ```

## 🛠️ Development & Enhancement

### Start in Development Mode

You can run LibreVA in development mode using a separate compose file. This will launch the Next.js web application in development mode and serve source code and dependencies from the host file system, enabling hot reload.

⚠️ To make this work, please ensure that you're running Node 20 on the host, and read the chapter below on platform compatibility if you are on Windows.

To start in development mode, run:

```bash
docker compose -f docker-compose-dev.yml -f docker-compose.gpu.yml up --build
```

The web app will then reload on code changes and the TTS backend will use your local `tts_service` code.

### ⚠️ Platform Compatibility: Native Modules & Node.js in WSL2

This project uses native Node modules (notably `sqlite3`), so you **must** install dependencies in the same environment as your container (Linux for most Docker images).

- **Why do we mount `node_modules` from the host?**

    - The editor/IDE on the host can resolve dependencies for intellisense, type checking, etc.
    - The container and host use the same `node_modules`, avoiding sync issues.
    - Hot reload works seamlessly.

- **On Windows:**

    - Use WSL2 (Windows Subsystem for Linux) for development.
    - Always use the WSL2-native Node.js and npm. Check with `which node` and `which npm` (should be `/usr/bin/node` or `~/.nvm/...`, not `/mnt/c/...`).
    - **Recommended:** Use nvm (Node Version Manager) to install Node.js in WSL2:
        ```bash
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        nvm install --lts
        nvm use --lts
        ```
    - Ensure your PATH in WSL2 does **NOT** include Windows Node.js or npm (e.g., `/mnt/c/Program Files/nodejs`).
    - This ensures all native modules are built for Linux, matching your container.
    - Open your project in WSL2 (e.g., Ubuntu) and run `npm install` there.
    - Do **not** run `npm install` from Windows CMD/PowerShell, or you will get Windows binaries that will not work in the container.
    - If you see errors like `Exec format error` or `invalid ELF header`, delete `node_modules` and `package-lock.json`, then reinstall in WSL2.

- **On Mac/Linux:**
    - Just run `npm install` as usual; your environment matches the container.

## 🔧 Troubleshooting

- To ensure you have a CUDA-capable graphics card, type `nvidia-smi` in a terminal and check for the `CUDA Version` output.
- If the `libreva-tts` service stops with the message `container libreva-libreva-tts-1 is unhealthy` at first start, Docker may have deemed your container unhealthy while it's actually still downloading dependencies or model files. Increase the healthcheck `start_period` parameter in [docker-compose.yml](docker-compose.yml).

## 🤝 Contributing

Feel free to fork, enhance, and submit pull requests! For questions or ideas, open an issue or discussion.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Chatterbox TTS (ResembleAI)](https://huggingface.co/ResembleAI/chatterbox)
- [Docker Desktop WSL2 backend](https://docs.docker.com/desktop/features/wsl/)
- [Docker Compose](https://docs.docker.com/compose/)

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
