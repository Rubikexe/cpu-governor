# CPU Governor

**CPU Governor** is a GNOME Shell extension that lets you quickly switch CPU governor modes directly from **Quick Settings**, with optional CPU temperature and frequency display in the top bar.

This project started as a personal tool and is now being released publicly as **version 1**.

---

## Features

- Quick Settings tile for switching CPU governor modes:
  - **Powersave**
  - **Balanced (schedutil)**
  - **Performance**
- Optional top bar CPU info:
  - CPU temperature
  - CPU frequency
  - or both
- Adjustable panel info position:
  - left
  - center
  - right
- Adjustable panel padding
- Configurable refresh interval
- **Boot boost**:
  - starts with **Balanced**
  - automatically switches to **Powersave** after a chosen delay
- Optional hiding of GNOME’s default **Power Mode** tile
- Preferences window built with **libadwaita**
- Built-in **backend installer / uninstaller**
- **Polish and English** support

---

## Requirements

This extension is currently tested on:

- **GNOME Shell 46**
- **Ubuntu-based Linux distributions**
- **systemd**
- Linux systems with **cpufreq governor support**

It also relies on:

- `pkexec`
- `inotify-tools`

The extension installer attempts to install required backend dependencies automatically on supported Ubuntu-like systems.

---

## Important Notes

### Backend installation is required
The extension can only change CPU governors after installing its system backend from the **Preferences** window.

Without backend installation:
- the Quick Settings tile will still appear,
- but governor switching will not work.

### Governor availability may vary
Not every Linux system supports the same CPU governors.

For example, some systems may not provide:

- `schedutil`

If a governor is not supported by your hardware / kernel / driver setup, it may not work even if it appears in the UI.

This will be improved in future versions.

---

## Installation

### Manual installation

1. Copy the extension folder to:

```bash
~/.local/share/gnome-shell/extensions/cpu-governor@rubik
```

2. Make sure schemas are compiled if needed.

3. Enable the extension:

```bash
gnome-extensions enable cpu-governor@rubik
```

4. Open extension preferences and click:

**Install**

to install the backend helper.

---

## Preferences

The extension includes settings for:

### Startup
- Boot boost enable / disable
- Boot boost duration

### Panel
- Show / hide panel info
- Display mode:
  - temperature
  - frequency
  - both
- Refresh interval
- Position:
  - left
  - center
  - right
- Left / right padding

### System
- Hide GNOME Power Mode tile
- Install / uninstall backend integration

---

## Project Status

This is the **first public release** of CPU Governor.

The extension is currently focused on:

- **GNOME 46**
- **Ubuntu-like systems**

Compatibility with other GNOME versions, Linux distributions, kernels, and CPU power management setups may vary.

This project will likely evolve over time with compatibility improvements and UI / backend refinements.

---

## Known Limitations

- Currently optimized for Ubuntu-like systems
- Tested mainly on GNOME Shell 46
- Some governors may not be available on all hardware
- Backend currently depends on `inotifywait`

---

## Development Notes

This extension uses:

- **GJS**
- **GNOME Shell Extension API**
- **libadwaita / GTK4**
- **systemd**
- **bash backend integration**
- **GSettings**

---

## License

This project is currently released as-is.

You may adapt this section later depending on the license you choose (for example: MIT, GPL, etc.).

---

## Author

Created by **Rubik**
