# How to Publish to Firebase Hosting

Since your project is already connected to Firebase for the database, deploying the web page to **Firebase Hosting** is very straightforward.

## Prerequisites
- You must have the project built (I have executed this for you).
- You need the **Firebase CLI**.

## Step-by-Step Deployment

1.  **Install Firebase Tools** (if not already installed):
    Open your terminal and run:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase**:
    This requires manual interaction. Run:
    ```bash
    firebase login
    ```
    *A browser window will open. Login with the Google account associated with `ridersbud-10806`.*

3.  **Initialize Hosting**:
    Run:
    ```bash
    firebase init hosting
    ```
    - **Select your project**: Choose `Use an existing project` -> `ridersbud-10806`.
    - **Public directory**: Type `dist` (This is important! Vite builds to `dist`).
    - **Configure as a single-page app**: Type `y` (Yes).
    - **Set up automatic builds and deploys with GitHub?**: Type `n` (No, unless you want to).
    - **Overwrite public/index.html?**: Type `N` (No! Do not overwrite).

4.  **Deploy**:
    Finally, confirm your build is fresh and deploy:
    ```bash
    npm run build
    firebase deploy
    ```

## Success!
After deployment, Firebase will give you a **Hosting URL** (e.g., `https://ridersbud-10806.web.app`). You can share this link with anyone!
