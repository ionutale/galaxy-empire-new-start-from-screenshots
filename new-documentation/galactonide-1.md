This video is a tutorial by **Cosden Solutions** titled **"Build a Multi-Step Form in React Like a Pro"**. It focuses on building a robust, production-grade multi-step form that handles complex validation, smooth animations, and data persistence.

Here is a comprehensive breakdown of the requirements to recreate this project yourself.

### **I. Functional Requirements**

_What the application must do for the user._

**1. Navigation & Flow**

- **Step Control:** Users must be able to navigate forward to the next step and backward to the previous step.
- **Progress Tracking:** The UI must display which step the user is currently on (e.g., Step 1 of 3).
- **Conditional Navigation:** Users cannot proceed to the next step until the current step is valid (all required fields are filled and correct).
- **Submission:** On the final step, the user can submit the entire form data payload.

**2. Form Data Management**

- **Data Collection:** Collect specific data points across multiple screens.
- _Step 1 (Personal Info):_ First Name, Last Name, Email.
- _Step 2 (Address):_ Street, City, State, Zip.
- _Step 3 (Preferences/Review):_ Additional data or a review screen.

- **State Persistence:** If the user refreshes the page, their entered data and current step should remain saved (using LocalStorage).

**3. Validation**

- **Per-Step Validation:** Each step must be validated individually before allowing the user to click "Next."
- **Schema-Based Rules:**
- _Email:_ Must be a valid email format.
- _Required Fields:_ Cannot be empty.
- _Data Types:_ Zip codes must be numbers/strings of specific length, etc.

---

### **II. Technical Requirements**

_The specific libraries and architecture used in the video._

**1. Core Stack**

- **Framework:** React (Next.js or Vite)
- **Language:** TypeScript (strongly recommended for the Zod schema inference).

**2. Key Libraries**

- **Form Management:** `react-hook-form`
- _Why:_ Handling form state, minimizing re-renders, and easy integration with validation libraries.

- **Validation:** `zod` & `@hookform/resolvers`
- _Why:_ Creating a strict schema for each step and a "Master Schema" for the final submission.

- **Animation:** `framer-motion`
- _Why:_ To create the smooth "slide-in/slide-out" effect when changing steps (the defining visual feature of the video).

- **Global State:** `zustand`
- _Why:_ To hold the form data globally so it persists even when a specific step component unmounts.

---

### **III. Implementation Plan (Architecture)**

To replicate the "Pro" approach shown in the video, you should not dump everything into one file. Follow this structure:

#### **A. The Data Layer (Zustand + Zod)**

1. **Define Schemas:**

- Create a Zod schema for _each_ step (e.g., `StepOneSchema`, `StepTwoSchema`).
- Merge them into a `CombinedSchema` using Zod's `.merge()` method.

2. **Create Store:**

- Use Zustand to create a store that holds `formData` (the combined object).
- Add actions: `setFormData`, `nextStep`, `prevStep`, `resetForm`.

#### **B. The Form Component (React Hook Form)**

1. **Single Source of Truth:**

- The parent component manages the `currentStep` index.

2. **Hook Integration:**

- Use `useForm` inside the _individual step components_ or the parent (the video suggests passing the specific schema to the form hook for that specific step).
- _Crucial Logic:_ On "Next", validate _only_ the current step's fields. If valid, dispatch data to the Zustand store and increment the step.

#### **C. The Animation Layer (Framer Motion)**

1. **Variants:**

- Define a generic animation variant object:

```javascript
const variants = {
	enter: (direction) => ({
		x: direction > 0 ? 1000 : -1000,
		opacity: 0
	}),
	center: { x: 0, opacity: 1 },
	exit: (direction) => ({
		x: direction < 0 ? 1000 : -1000,
		opacity: 0
	})
};
```

2. **AnimatePresence:** Wrap your step components in `<AnimatePresence custom={direction}>` to handle the mounting/unmounting animations simultaneously.

---

### **IV. Next Step**

Would you like me to generate the **starter code boilerplate** for the `store.ts` (Zustand) and `schema.ts` (Zod) files to get you started?
