# macOS Input Method Switching and Terminal Research

## Known Issues with macOS Input Method Switching

### Terminal.app and Input Methods
1. **AppleScript Automation Issues**: When Terminal is controlled via AppleScript, input method switching can cause conflicts
2. **Process Isolation**: Detached processes may not properly handle input source change notifications
3. **Event Handling**: Terminal windows created via automation may not properly register for system events

### Common Symptoms
- Terminal window becomes unresponsive after input method change
- Process hangs or crashes when switching between input methods (e.g., English <-> Chinese)
- AppleScript-controlled Terminal windows more susceptible than manually opened ones

### Research Findings
1. **AppleScript + Input Methods**: There are known compatibility issues between AppleScript Terminal automation and input method switching on macOS
2. **System Event Handling**: Applications need to properly handle `NSTextInputSourceChanged` notifications
3. **Terminal Automation**: Using `tell application "Terminal"` can interfere with native input handling

## Potential Solutions
1. **Use iTerm2 as Alternative**: iTerm2 handles input method switching better
2. **Avoid AppleScript**: Use native terminal commands instead of AppleScript automation
3. **Better Process Management**: Ensure proper cleanup and event handling
4. **Environment Variables**: Set proper locale and input method environment variables