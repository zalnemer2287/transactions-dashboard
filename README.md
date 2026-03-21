# Transactions Dashboard – Technical Assessment

## Overview
This project is a mock Transactions dashboard built as part of a technical assessment for MM Global Solutions Consulting (MMGSC).  
It simulates an internal tool used by operations staff to monitor and investigate ATM transaction activity.

The application retrieves transaction data from backend APIs and provides filtering, searching, and interaction features based on the provided wireframe.

---

## Features

- Transactions table populated from backend APIs
- Filtering by:
  - ATM ID (multi-select dropdown)
  - Date range
  - Customer PAN
  - Transaction Serial Number
- Search across all table data
- Dynamic UI feedback (dropdown summaries, input validation)
- Sidebar navigation (non-implemented pages show placeholder)
- Print/Export buttons (not implemented as allowed)

---

## How to Run

You can access or run this project in multiple ways:

### Option 1 – Live Demo 
Visit the HOSTED version:
[View Live Transactions Dashboard](https://zalnemer2287.github.io/transactions-dashboard/)

---

### Option 2 – Run Locally 
1. Download or clone the repository from GitHub:  
   [GitHub Repository](https://github.com/zalnemer2287/transactions-dashboard)
2. Open `index.html` in any modern web browser

---

### Option 3 – From Submitted ZIP
1. Extract the ZIP file
2. Open `index.html` in a web browser

No additional setup or dependencies are required.

---

## User Stories (JIRA Style)

### 1. Filter by ATM ID
**User Story:**  
As an operations staff member,  
I want to filter transactions by ATM ID,  
so that I can investigate activity from specific machines.

**Acceptance Criteria:**
- Dropdown list of ATM IDs is available
- User can select one or multiple ATMs
- Selecting "All ATMs" clears other selections
- Dropdown text reflects selected count
- Table updates dynamically

---

### 2. Search Transactions (Quick Lookup)
**User Story:**  
As an operations staff member,  
I want to search transaction results using keywords,  
so that I can quickly locate records containing specific codes or descriptions.

**Acceptance Criteria:**
- Search input filters results in real time
- Search applies across multiple columns
- Partial matches are supported
- Clearing input resets results

---

### 3. Filter Input Feedback
**User Story:**  
As an operations staff member,  
I want filter inputs to provide clear feedback,  
so that I can understand invalid input and current selections.

**Acceptance Criteria:**
- Invalid inputs are visually highlighted
- Dropdown shows selection summary
- Inputs respond to interaction (focus, typing)
- Changes immediately affect table results

---

### 4. View Transactions in Table Format
**User Story:**  
As an operations staff member,  
I want to view transactions in a structured table,  
so that I can efficiently scan and analyze transaction data.

**Acceptance Criteria:**
- Transactions displayed in rows and columns
- Columns include Date, ATM ID, Customer PAN, Description, Code
- Data is retrieved from backend APIs
- Table updates when filters are applied

---

### 5. Filter by Date Range
**User Story:**  
As an operations staff member,  
I want to filter transactions by a date range,  
so that I can analyze activity within a specific time period.

**Acceptance Criteria:**
- Date range selector is available
- User can select start and end dates
- Table updates based on selected range
- Clearing selection resets filter

---

## AI Usage Disclosure

AI (ChatGPT) was used as a development aid during this project.

It was primarily used for:
- Clarifying requirements and interpreting the wireframe
- Brainstorming implementation approaches for UI features and interactions
- Researching how to implement specific functionality (e.g., multi-select filters, date range selection)
- Assisting with structuring filtering logic and overall application flow
- Exploring external tools and libraries (e.g., Flatpickr for date selection)

AI was helpful for generating ideas and speeding up research, and in many cases provided example code snippets. However, its responses were not always directly usable and sometimes required adjustment, verification, or rewriting to fit the specific requirements of the project.

All code was reviewed, tested, and integrated manually.  
I understand the implementation and can explain all parts of the project.

### Example Prompts Used

- "How to fetch API data and populate a table in JavaScript"
- "How to implement a multi-select dropdown with checkboxes"
- "How to structure filtering logic for multiple inputs"
- "How to convert a numeric timestamp into a readable date in JavaScript"
- "How to search across multiple fields in a dataset"
- "How to structure a clean and responsive dashboard layout using CSS Grid and Flexbox"
- "Best practices for styling data tables for readability and usability"
- "How to design consistent spacing and alignment for UI components in a web application"
- "How to build a reusable function for table rendering"
- "How to implement input validation for numeric fields"
- "How to display dynamic dropdown text based on selections"
- "How to implement a date range picker in a single input field (Flatpickr)"

AI was used as a productivity and learning tool, similar to documentation, Stack Overflow, or online resources.

---

## Notes

- The implementation follows the provided wireframe as closely as possible given API limitations
- Some backend data structures are inconsistent, so fallback logic was implemented for robustness
- Certain features (Print/Export, additional pages) are intentionally marked as "Not implemented" per instructions
