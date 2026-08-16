# Frontend Documentation

The frontend of **Namma Connect** is built using React, Vite, and TailwindCSS. It provides a visual interface for tourists, farmers, and creators.

---

## 📁 Version History (v1 vs v2)

- **v1 (Legacy)**: The initial mockup design layout that verified user flows.
- **v2 (Current)**:
  - Built on Vite for high-speed local development and optimized build sizes.
  - Fully integrated with the backend API.
  - Utilizes standard React hooks and React Router to navigate views.

---

## 🔌 API Integration

- **Client Setup**: Axios/Fetch calls handle communication with the backend.
- **Prefix Path**: The client targets `/api` prefix paths for maximum compatibility.
- **Auth Header**: On successful login, the frontend stores the JSON Web Token in the browser's `localStorage` and appends it to subsequent request headers:
  ```javascript
  Authorization: Bearer <JWT_TOKEN>
  ```

---

## 👥 Role-Based Dashboards

Based on the role returned during registration or login (`tourist`, `farmer`, or `creator`), the client routes the user to their designated dashboard layout:

1. **Tourist View**:
   - Offers farm discovery lists and filters.
   - Handles checkout screens and lists booked reservations.
2. **Farmer Dashboard**:
   - Displays farm listings, details editing, and visitor analytics.
   - Manages reservation requests (Allows accepting or rejecting pending tourist stays).
3. **Creator Studio**:
   - Manages personal portfolio links.
   - Shows collaboration bookings with various farm sites.
