# 📸 Digital Photo Booth System

A React + Vite photo booth app that captures photos, overlays custom event frames via Canvas, uploads to **Google Drive** (Apps Script), and shows a **QR code** for instant mobile download.

---

## ✨ Features

- 📷 **Live Photo Capture & Upload**: Capture photos using your device camera or select images from your gallery.
- 🖼️ **Dynamic Frame Selection**: Preview photos inside customized event frames in real-time.
- 🎨 **HTML5 Canvas Processing**: Combines camera photos with transparent overlays at high resolution (1080x1080).
- ☁️ **Serverless Google Drive Upload**: Directly uploads images using Google Apps Script Web App without requiring a dedicated backend server.
- 📱 **Instant QR Code Download**: Generates an on-screen QR code so users can scan and download their photos directly on their smartphones.
- ⚡ **Built with Vite & React**: Superfast build times and modern UI powered by Tailwind CSS.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **QR Code**: [qrcode.react](https://www.npmjs.com/package/qrcode.react)
- **Backend / Cloud**: Google Apps Script & Google Drive API

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/photo-booth-system.git
cd photo-booth-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory by copying the `.env.example` file:

```bash
cp .env.example .env
```

Open `.env` and set your Google Apps Script Web App URL:
```env
VITE_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

> **Note**: The `.env` file contains your private deployment endpoints and is already ignored by `.gitignore`. Never commit your `.env` file to GitHub!

### 4. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173/`.

### 5. Build for Production
```bash
npm run build
```

---

## 📁 Project Structure

```text
photo-booth-system/
├── public/
│   └── frames/              # Frame overlays (e.g. frame1.png, frame2.png)
├── src/
│   ├── App.tsx              # Main Photo Booth logic and UI
│   ├── main.tsx             # React application entry point
│   └── style.css            # Tailwind CSS styling setup
├── .env.example             # Example environment file template
├── .gitignore               # Git ignored files (includes .env, node_modules)
├── index.html               # Main HTML entry
├── package.json             # Project dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration with React & Tailwind
└── README.md                # Project documentation
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
