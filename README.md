# Event Management System

Please Read!! T^T

## Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js + Express.js
* **Database:** MongoDB
* **Version Control:** Git + GitHub

---

# Getting Started

Before working on the project, make sure the following are installed on your computer:

### Required Software

* Node.js
* Git
* Visual Studio Code
* MongoDB Compass (optional, but recommended)
* Postman (recommended for testing backend APIs)

You can check whether Node.js and Git are installed by running:

```bash
node --version
npm --version
git --version
```

If these commands return version numbers, they are installed correctly.

---

# 1. Clone the Repository

You only need to clone the repository **once**.

Open a terminal in the folder where you want to save the project:

```bash
git clone <repository-url>
```

Then enter the project folder:

```bash
cd EventManagementSystem
```

Do **not** download the repository as a ZIP if you plan to contribute code. Clone it using Git.

---

# 2. Install Dependencies

Dependencies such as Express, Mongoose, React, Axios, etc. are not included directly in Git.

After cloning the project, install them using:

```bash
npm install
```

If the project has separate frontend and backend folders, install dependencies inside both.

Example:

```bash
cd ems-backend
npm install
```

Then:

```bash
cd ../ems-frontend
npm install
```

Do not commit the `node_modules` folder.

---

# 3. Environment Variables

The project requires a `.env` file for private configuration such as:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
```

Check our Discord Server 

**Never commit `.env` to GitHub.**

Make sure `.env` is included in `.gitignore`.

---

# 4. Starting the Project

## Backend

Go to the backend directory:

```bash
cd ems-backend
```

Then start the development server:

```bash
npm run dev
```

If there is no `dev` script, check `package.json` for the available scripts.

## Frontend

Open another terminal:

```bash
cd ems-frontend
npm install
npm run dev
```

Keep the frontend and backend terminals running while developing.

---

# Git Workflow

## Important Rule

**Do not directly develop features on `main`.**

Each feature should have its own branch.

Our basic workflow is:

```text
Update local repository
        ↓
Create feature branch
        ↓
Work on feature
        ↓
Test your changes
        ↓
git add
        ↓
git commit
        ↓
git push to branch "Development"
        ↓
Create Pull Request
        ↓
Review (Me)
        ↓
Merge (Me)
```

---

# Before Starting a Feature

First, go to the main branch:

```bash
git switch main
```

Get the latest changes:

```bash
git pull origin main
```

Then create your feature branch:

```bash
git switch -c feature/<feature-name>
```

Example:

```bash
git switch -c feature/login
```

Other examples:

```bash
git switch -c feature/event-dashboard
git switch -c feature/create-event
git switch -c feature/user-profile
git switch -c feature/attendance
```

Now you can start coding.

---

# Checking Your Current Branch

Run:

```bash
git branch
```

Example:

```text
  main
* feature/login
```

The `*` indicates your current branch.

You can also use:

```bash
git status
```

Use `git status` frequently. It tells you which files were modified, added, deleted, or staged.

---

# Saving Your Work

After making changes, check them:

```bash
git status
```

Stage your changes:

```bash
git add .
```

Then commit:

```bash
git commit -m "feat: implement user login"
```

Push your branch:

```bash
git push -u origin feature/login
```

After the first push, you can normally use:

```bash
git push
```

---

# Commit Message Format

Use this format:

```text
type: short description
```

Examples:

```bash
git commit -m "feat: add user registration"
```

```bash
git commit -m "fix: resolve event creation error"
```

```bash
git commit -m "refactor: separate authentication controller"
```

Keep commit messages short but descriptive.

---

# Commit Types

### `feat:`

Use when adding a new feature.

```text
feat: add user login
feat: implement event creation
feat: add attendance management
```

### `fix:`

Use when fixing a bug.

```text
fix: resolve duplicate email validation
fix: correct event status validation
fix: prevent empty first name
```

### `refactor:`

Use when restructuring or improving existing code without introducing a new feature.

```text
refactor: separate authentication controller
refactor: simplify user update logic
```

### `docs:`

Use for documentation changes.

```text
docs: update project setup instructions
docs: add API documentation
```

### `style:`

Use for formatting or code-style changes that do not change functionality.

```text
style: format user controller
```

### `chore:`

Use for maintenance, configuration, or tooling changes.

```text
chore: update dependencies
chore: configure environment variables
```

---

# Commit Message Template

Use:

```text
<type>: <what you changed>
```

For example:

```text
feat: add event creation
fix: resolve login validation
refactor: separate user and auth controllers
docs: update README
chore: install authentication dependencies
```

Avoid unclear commit messages such as:

```text
update
changes
fixed
final
final final
test
asdf
work
```

Your commit message should tell the team **what changed**.

---

# Working on Another Feature

Do not continue unrelated work on the same feature branch.

For example, after finishing:

```text
feature/login
```

switch back to main:

```bash
git switch main
```

Update it:

```bash
git pull origin main
```

Then create another branch:

```bash
git switch -c feature/event-dashboard
```

This keeps features separated and makes code reviews easier.

---

# Getting Updates From Main

If another groupmate's work has already been merged into `main`, update your local main branch:

```bash
git switch main
git pull origin main
```

Then continue with your next feature branch.

If you already have unfinished work on a feature branch, **do not blindly switch branches or pull changes if you are unsure what will happen to your work.**

Commit your work first or ask the team for help.

---

# Pull Requests

After pushing your feature branch to GitHub:

```bash
git push -u origin feature/login
```

Open the repository on GitHub and create a **Pull Request** from:

```text
feature/login
      ↓
main
```

Describe what you implemented and anything your groupmates should know.

Do not merge unfinished or untested features into `main`.

---

# Files That Should Not Be Committed

Do not commit:

```text
node_modules/
.env
*.log
```

These should be handled through `.gitignore`.

Especially:

**Never push passwords, database credentials, API keys, JWT secrets, or other private credentials to GitHub.**

---

# Quick Git Cheat Sheet

Clone repository:

```bash
git clone <repository-url>
```

Check status:

```bash
git status
```

Check branches:

```bash
git branch
```

Switch branch:

```bash
git switch main
```

Create and switch to a branch:

```bash
git switch -c feature/feature-name
```

Get latest changes:

```bash
git pull origin main
```

Stage changes:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: description"
```

Push:

```bash
git push
```

First push of a new branch:

```bash
git push -u origin feature/feature-name
```

---

# Recommended Daily Workflow

When starting work:

```bash
git switch main
git pull origin main
git switch -c feature/feature-name
```

Work on your assigned feature.

When finished:

```bash
git status
git add .
git commit -m "feat: describe your feature"
git push -u origin feature/feature-name
```

Then create a Pull Request on GitHub.

---

# Team Rules

1. Do not directly work on `main`.
2. Create a branch for each feature or task.
3. Pull the latest `main` before creating a new branch.
4. Use clear commit messages.
5. Test your feature before pushing.
6. Do not commit `.env`.
7. Do not commit `node_modules`.
8. Do not push API keys, passwords, database credentials, or secrets.
9. Do not delete or rewrite another member's code without discussing it with the team.
10. Use Pull Requests before merging features into `main`.

---

# Need Help?

If you encounter a Git conflict, error, or are unsure about a command, **do not randomly run commands from the internet that may delete your work**.

Ask the group first and include:

```bash
git status
```

and the error message you received.

This makes it much easier to identify the problem.
