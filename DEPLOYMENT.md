# ZENSURE Deployment Guide

Follow these steps to deploy the ZENSURE platform to production.

## Prerequisites
- [GitHub Account](https://github.com) (You already have the code at `https://github.com/Saicharan345/Zensure`)
- [Render Account](https://render.com) (For the Backend)
- [Vercel Account](https://vercel.com) (For the Frontend)

---

## Step 1: Deploy the Backend (Render)

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub account and select the `Zensure` repository.
4. Render will automatically detect the `render.yaml` file.
5. **DO NOT CLICK DEPLOY YET.** Click on "Instance Customization" or wait for the environment variables to appear.
6. Leave the environment variables as they are for now.
7. Click **Apply**.
8. Once the deployment starts, wait for it to finish. You will see a URL like `https://zensure-api.onrender.com`.
9. **COPY THIS URL.** You will need it for the frontend.

---

## Step 2: Deploy the Frontend (Vercel)

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New** and select **Project**.
3. Import the `Zensure` repository.
4. For the **Root Directory**, click **Edit** and select the `frontend` folder.
5. Expand **Environment Variables**.
6. Add the following variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://zensure-api.onrender.com` (Replace this with YOUR actual Render URL from Step 1)
7. Click **Deploy**.
8. Once finished, you will get a Frontend URL, for example: `https://zensure.vercel.app`.
9. **COPY THIS URL.**

---

## Step 3: Connect Frontend to Backend (CORS)

For security, the backend needs to know your frontend URL to allow requests.

1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Select your `zensure-api` service.
3. Go to the **Environment** tab.
4. Find the `ZENSURE_CORS_ORIGINS` variable.
5. Change its value to your Vercel URL (e.g., `https://zensure.vercel.app`).
6. Click **Save Changes**. Render will automatically redeploy the backend.

---

## Step 4: Verification

1. Open your Vercel URL in your browser.
2. Try to log in with the default credentials:
   - **Admin**: `admin@gmail.com` / `adminxyz`
   - **Worker**: `worker@zensure.io` / `workerpassword`
3. If everything is connected, you will see your dashboard populated with data!

---

> [!NOTE]
> **Database Reset**: Since this is a demo using SQLite on Render's free tier, any new data you create (like new workers or claims) will be lost if the server restarts. This is normal for a free-tier demo.
