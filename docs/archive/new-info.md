This video is a **comprehensive tutorial by Prismic** titled _"SvelteKit Crash Course: Build a Full Website in 90 min!"_. It walks you through building a dynamic, production-ready marketing website from scratch using SvelteKit and a Headless CMS (Prismic).

Since you prefer **SvelteKit**, this project is an excellent way to learn how to handle server-side data, dynamic routing, and "Slices" (reusable page sections). Here are the requirements to recreate it.

---

### **I. Functional Requirements**

_What the application must do._

**1. Dynamic Routing & Content**

- **Page Generation:** The app must support dynamic routes (e.g., `/blog/[slug]`) where content is fetched based on the URL.
- **Global Layout:** A persistent Header and Footer must be visible across all pages.
- **Rich Text Rendering:** Support for complex text formatting (bold, links, headings) coming from an external source.

**2. Component-Based Design (Slices)**

- **Modular Sections:** Instead of fixed page templates, the app should use "Slices." A user in a CMS should be able to stack sections like "Hero," "Features," and "Image Gallery" in any order.
- **Interactive Elements:** Components like a navigation menu with "active state" styling.

**3. Forms & Interactivity**

- **Contact Form:** A functional form to collect user input.
- **Progressive Enhancement:** The form should work even if JavaScript is disabled in the browser (using SvelteKit's native `enhance` action).

---

### **II. Technical Requirements**

_The tech stack and SvelteKit-specific features used._

**1. The SvelteKit Foundation**

- **State Management:** Use Svelte’s `$props()` (for Svelte 5) or standard props to pass data from layouts to pages.
- **Styling:** The video uses **Open Props** (a CSS variable library) and standard CSS/SASS.
- **Images:** Utilize the `svelte-prismic` image component or standard responsive `<img>` tags for optimized loading.

**2. Data Loading & Backend Logic**

- **`+page.server.ts`:** All data fetching from the CMS must happen on the server to ensure SEO and hide API keys.
- **`+layout.server.ts`:** Fetch global data (like navigation links or site settings) that every page needs.

**3. Headless CMS Integration (Prismic)**

- **Slice Machine:** A local development tool to define your component structures (schemas).
- **API Client:** Use the `@prismicio/client` to query your content.

---

### **III. Implementation Checklist**

| Feature           | SvelteKit File / Tool                                    |
| ----------------- | -------------------------------------------------------- |
| **Root Layout**   | `src/routes/+layout.svelte`                              |
| **Global Data**   | `src/routes/+layout.server.ts`                           |
| **Dynamic Page**  | `src/routes/[uid]/+page.svelte`                          |
| **Form Actions**  | `+page.server.ts` using `export const actions = { ... }` |
| **Section Logic** | `<SliceZone />` component to loop through page sections  |

---

### **IV. Architecture Overview**

The video emphasizes a "Clean Architecture" where the CMS acts as the brain and SvelteKit acts as the body.

1. **Request:** User hits a URL.
2. **Server:** `+page.server.ts` asks the CMS for data for that specific URL.
3. **Client:** SvelteKit renders the `+page.svelte` using the returned data and hydrates the page for interactivity.

### **Next Step**

Since this tutorial relies heavily on a CMS, would you like me to show you how to set up the **SvelteKit Form Action** for the contact section, or would you prefer a breakdown of the **SvelteKit project folder structure**?
