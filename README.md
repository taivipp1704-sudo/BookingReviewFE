# ClarityCam Frontend (FE)

Thu muc nay la workspace frontend doc lap. Mo rieng `D:\DemoReview\FE` bang VS Code.

## Chay local

Yeu cau Node.js LTS va backend dang chay tai `http://127.0.0.1:8080`.

```powershell
cd D:\DemoReview\FE
npm install
npm run dev
```

Mo `http://127.0.0.1:5175`. Vite se proxy cac request `/api` sang backend.

## Lenh kiem tra

```powershell
npm test
npm run build
```

Neu backend chay tai dia chi khac, sao chep `.env.example` thanh `.env` va dat
`VITE_API_BASE_URL` thanh URL cua backend.

Khi deploy tren Vercel, `vercel.json` proxy `/api/*` sang Render va fallback cac
route cua React SPA ve `index.html`. Khong can dat `VITE_API_BASE_URL` tren Vercel.

