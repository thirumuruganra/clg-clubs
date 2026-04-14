# Contributing to WAVC

Thanks for your interest in contributing to WAVC (What's Active in Various Clubs).

This project is built for students, especially from SSN and SNUC, and contributions are welcome from everyone.

## Ways to Contribute

- Report bugs
- Suggest features
- Improve documentation
- Fix issues
- Add tests
- Improve UI/UX and accessibility

## Before You Start

1. Check existing issues/PRs to avoid duplicate work.
2. Raise an issue before starting work so maintainers can confirm scope and approach.
3. Keep pull requests focused and reasonably small.

## Required Contribution Flow

1. Raise or get assigned to an issue first.
2. Create a new branch from `main` using your name.
3. Make your changes in that branch.
4. Open a pull request targeting `main`.
5. Wait for review and approval before merge.

Do not push directly to `main`.
Do not make changes on `heroku-deploy-setup`, and do not pull from `heroku-deploy-setup` to start your work.

## Local Setup

### Backend

```bash
cd backend
source wavc/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Make sure both backend and frontend are running while you test.

## Branch and Commit Guidelines

- Create a feature branch from `main` with your name in it:

```bash
git checkout main
git pull
git checkout -b yourname/short-description
```

- Write clear commit messages.
- Keep each commit focused on one logical change.
- Push only your branch and open a PR to merge into `main`.
- Never commit or push directly to `main`.
- Do not commit to `heroku-deploy-setup`, and do not branch from or pull from `heroku-deploy-setup` for contributions.

## Code Quality Checklist

Before opening a PR:

1. Run frontend lint checks:

```bash
cd frontend
npm run lint
```

2. Build frontend to catch bundling issues:

```bash
npm run build
```

3. Ensure backend starts without errors:

```bash
cd ../backend
source wavc/bin/activate
uvicorn app.main:app --reload
```

4. Verify your change manually in the UI/API.
5. Update docs if behavior or setup changed.

## Pull Request Checklist

- Clear title and summary
- Linked issue (if applicable)
- Screenshots/GIFs for UI changes
- Steps to test your changes
- No unrelated refactors mixed in

## Reporting Bugs

Please include:

- What happened
- What you expected
- Steps to reproduce
- Screenshots/logs (if relevant)
- Your environment (OS, browser, Python/Node versions)

## Community Standards

By participating in this project, you agree to follow the Code of Conduct in [CODE-OF_CONDUCT.md](./CODE-OF_CONDUCT.md).
