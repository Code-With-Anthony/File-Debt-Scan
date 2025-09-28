# File-Debt-Scan
File-Debt-Scan is a lightweight, single-file Node.js CLI tool designed to help developers efficiently track technical debt in their codebases. It recursively scans any project directory for TODO and FIXME comments, providing both human-readable and machine-readable JSON outputs. The tool intelligently ignores its own file, default folders like node_modules and .git, and optionally handles hidden files with --exclude-hidden or --only-hidden flags. It supports custom search patterns and additional ignore rules, making it flexible for diverse projects. By combining simplicity, cross-platform support, and real-world utility, File-Debt-Scan fits perfectly within the “Terminal Toolbox” theme, enabling developers to quickly identify incomplete work and maintain cleaner code. It has No dependencies and works out-of-the-box with Node.js

## 🛠 Features

- Scan any folder recursively for `TODO` or `FIXME` markers  
- **JSON output** for machine consumption (`--json`)  
- Ignore the scanner itself automatically  
- Default ignored folders: `node_modules` and `.git`  
- Optional hidden file handling:
  - `--exclude-hidden`: skip hidden files/folders  
  - `--only-hidden`: scan only hidden files/folders  
- Custom pattern search via `--pattern "PATTERN"`  
- Additional ignore folders/files via `--ignore NAME`  

## ⚡ Installation

1. Clone/download the file `file-debt-scan.cjs`  
2. Make it executable (optional):

```bash
chmod +x todo-scan.cjs
````

3. Ensure Node.js (v18+) is installed

---

## Usage

### Scan current directory (human-readable)

```bash
node todo-scan.cjs
```

### JSON output

```bash
node todo-scan.cjs --json
```

### Scan a specific folder

```bash
node todo-scan.cjs src --json
```

### Custom pattern search

```bash
node todo-scan.cjs . --pattern "BUG|HACK" --json
```

### Exclude hidden files/folders

```bash
node todo-scan.cjs . --exclude-hidden --json
```

### Scan only hidden files/folders

```bash
node todo-scan.cjs . --only-hidden --json
```

### Ignore specific folders/files

```bash
node todo-scan.cjs . --ignore dist --ignore build --json
```

---

## 📄 Examples

**Human-readable output:**

```
Found 3 markers in 2 files:

src/pages/Auth.tsx — 1
  25 │ // TODO: Check if user is already logged in

.git/hooks/sendemail-validate.sample — 2
  27 │ # TODO: Replace with appropriate checks
  35 │ # TODO: Replace with appropriate checks for this patch
```

**JSON output:**

```json
{
  "scannedDir": "/path/to/project",
  "count": 3,
  "items": [
    {
      "file": "src/pages/Auth.tsx",
      "line": 25,
      "text": "// TODO: Check if user is already logged in"
    },
    {
      "file": ".git/hooks/sendemail-validate.sample",
      "line": 27,
      "text": "# TODO: Replace with appropriate checks"
    },
    {
      "file": ".git/hooks/sendemail-validate.sample",
      "line": 35,
      "text": "# TODO: Replace with appropriate checks for this patch"
    }
  ]
}
```

---

## ✅ Notes

* Works on **Windows, macOS, and Linux**
* Uses **only Node.js built-in modules**
