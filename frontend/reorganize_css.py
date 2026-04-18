import re

def organize_css(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Step 1: Update light theme colors for better contrast
    light_theme_pattern = r"\[data-theme='light'\]\s*\{[^}]+\}"
    new_light_theme = """[data-theme='light'] {
  --bg-main: #f4f2ec;
  --bg-panel: rgba(255, 255, 255, 0.95);
  --bg-elevated: #ffffff;
  --bg-soft: rgba(0, 0, 0, 0.06);
  --text-main: #141b18;
  --text-muted: #5e6b64;
  --line: rgba(0, 0, 0, 0.12);
  --accent-gold: #c78d26;
  --accent-green: #1d7243;
  --accent-red: #b83f2a;
  --accent-blue: #227999;
  --shadow-strong: 0 15px 45px rgba(26, 36, 32, 0.1);
  --glass-blur: 15px;

  --grad-start: #fbf9f4;
  --grad-mid: #f5f0e6;
  --grad-end: #ede7d9;
  --grad-accent-1: rgba(33, 99, 65, 0.04);
  --grad-accent-2: rgba(178, 130, 53, 0.04);
  --grad-accent-3: rgba(45, 122, 150, 0.04);
}"""
    content = re.sub(light_theme_pattern, new_light_theme, content)

    # Step 2: Update .auth-switch css
    switch_pattern = r"\.auth-switch\s*\{[^}]+\}"
    new_switch = """.auth-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  background: var(--bg-soft);
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.auth-switch:hover {
  background: var(--line);
  color: var(--text-main);
}"""
    content = re.sub(switch_pattern, new_switch, content)

    active_switch_pattern = r"\.auth-switch\.active\s*\{[^}]+\}"
    new_active_switch = """.auth-switch.active {
  background: var(--bg-panel);
  color: var(--text-main);
  border-color: var(--accent-green);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-weight: 600;
}
[data-theme='dark'] .auth-switch.active {
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}"""
    content = re.sub(active_switch_pattern, new_active_switch, content)

    # Note: A full semantic reorganization of 1100 lines of CSS in Python is tricky.
    # Instead, let's group them by simple string matching and appending.
    # I'll just write the full CSS directly.
    
    with open(file_path, 'w') as f:
        f.write(content)

organize_css('src/app/globals.css')
