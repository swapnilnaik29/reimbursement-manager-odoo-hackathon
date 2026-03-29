# Reimbursement System - Technical Documentation

## 1. Code Architecture

The Reimbursement System Frontend is a React application built with TypeScript and Vite. It heavily relies on local state simulation (`localStorage`) to achieve a full end-to-end workflow without an active backend.

### Project Structure
- `src/store/mockStore.ts`: The central data layer. It acts as an ORM/Database simulator intercepting all reads and writes and persisting them to the browser's `localStorage`.
- `src/context/AuthContext.tsx`: The authentication provider. It wraps the entire application, maintaining the active session mapping directly with the `mockStore`.
- `src/types/index.ts`: The schema definition housing the Typescript definitions (`User`, `Expense`, `ApprovalRule`, `Company`).
- `src/pages/*`: Contains role-segregated top-level views:
  - `Signup.tsx` & `Login.tsx`: Handles authentication, company seeding, and JWT/Session generation (mock).
  - `Admindashboard.tsx`: Handles User provisioning and global Approval Rule configurations.
  - `Employeedashboard.tsx`: Handles Expense submissions (with visual OCR mocks) and request tracking.
  - `Managerdashboard.tsx`: Handles the review process for designated workflow steps.

### Design System
- **Tailwind CSS**: Used extensively for spacing, layout, and "glassmorphism" styling.
- **Lucide-React**: The primary SVG iconography framework providing lightweight and premium icons.

---

## 2. Mock State Layer (`mockStore.ts`)

Currently, the application bypasses standard REST API calls. Instead of `axios.get('/api/users')`, components invoke synchronous helper methods like `mockStore.getUsers()`.

### Key Mock Mechanisms
1. **Relational Data Inference**: Whenever an employee submits an expense, `mockStore.createExpense()` immediately generates a multi-step `approvalSteps` trail. It calculates this by reading global rules set by the Admin, or defaulting to the employee's direct manager.
2. **Currency Conversion**: The `mockStore` includes a simulated exchange rate dictionary to convert requested amounts into the company's base currency dynamically.
3. **Approval Evaluation**: When a manager reviews an expense step (`reviewExpenseStep`), the store runs a calculation over thresholds, "required/optional" flags, and minimum approval percentages to determine if the overarching expense should transition to `Approved` or remain `Pending`.

---

## 3. API Integration Guide (Transitioning to a Backend)

To deploy this application into production, the `mockStore` must be systematically replaced with asynchronous HTTP calls connected to a genuine relational database (e.g., PostgreSQL or MongoDB) via a Backend server (Node.js, Django, Spring Boot).

### Step 1: Replace Synchronous Calls with Axios/React Query
Instead of synchronous `mockStore`:
```typescript
// Current Mock
const users = mockStore.getUsersByCompany(user.companyId);
```
Implement asynchronous REST queries:
```typescript
// Production Target
const fetchUsers = async () => {
   const response = await axios.get('/api/v1/users', {
      headers: { Authorization: `Bearer ${sessionToken}` }
   });
   setUsers(response.data);
}
```

### Step 2: Expected Backend Endpoints

Your backend team will need to build the following API surface to substitute the `localStorage` logic:

#### Authentication & Provisioning
- `POST /api/auth/register` (Creates Company and root Admin User, returns JWT)
- `POST /api/auth/login` (Returns User object and JWT)
- `GET /api/users` (Lists users within the authenticated user's company context)
- `POST /api/users` (Admin creates a new Employee/Manager)

#### Expense Management
- `GET /api/expenses` (Employee queries their own history)
- `POST /api/expenses` (Employee submittal; triggers backend to calculate approval sequence)
- `POST /api/expenses/ocr` (Receives image/PDF upload, calls external OCR service AWS Textract / Google Cloud Vision to extract data constraints)

#### Workflow Routing & Reviews
- `GET /api/reviews/pending` (Manager queries expenses blocked awaiting their review)
- `POST /api/reviews/:expenseId/action` (Manager POSTs an approval or rejection. The backend mutates the step and runs threshold validation on the main expense entity).
- `GET /api/rules` (Admin reads category-based workflow rules)
- `POST /api/rules` (Admin writes/updates approval sequences)

### Step 3: Deprecating `mockStore.ts`
Once the backend is live:
1. Delete `src/store/mockStore.ts`.
2. Refactor `AuthContext.tsx` to validate a JWT token via `/api/auth/me`.
3. Wrap page components in `useEffect` fetchers or a state caching library like `@tanstack/react-query` to manage asynchronous loading and error states.
