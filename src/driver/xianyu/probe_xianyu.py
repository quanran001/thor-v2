import uiautomation as auto
import time
import os

# Set output encoding to utf-8 for console
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def probe():
    print("=== Xianyu UI Probe Tool ===")
    print("Looking for Xianyu window...")

    # Try 1: Exact Name
    win = auto.WindowControl(searchDepth=1, Name="闲鱼")
    
    # Try 2: Substring if exact fail
    if not win.Exists(1):
        print("Exact match '闲鱼' not found, trying substring...")
        # Get all windows and filter
        root = auto.GetRootControl()
        for child in root.GetChildren():
            if "闲鱼" in child.Name or "Xianyu" in child.Name:
                win = child
                break
    
    if win.Exists(0):
        print(f"\n✅ SUCCESS: Found Window '[{win.Name}]'")
        print(f"Handle: {win.NativeWindowHandle}")
        print("ClassName:", win.ClassName)
        
        print("\n--- Inspecting UI Elements (First Level) ---")
        # List children controls
        children = win.GetChildren()
        for idx, child in enumerate(children):
            print(f"[{idx}] Type: {child.ControlTypeName} | Name: '{child.Name}' | Class: {child.ClassName}")
            
            # If we see Document or Edit, it might be the chat box
            if child.ControlTypeName == "EditControl" or child.ControlTypeName == "DocumentControl":
                print("   *** POSSIBLE INPUT BOX ***")
            
            # If we see List, it might be chat list
            if child.ControlTypeName == "ListControl":
                print("   *** POSSIBLE CHAT LIST ***")
                
        print("\n-------------------------------------------")
        print("Probe Complete. If you see 'Input Box' or 'Chat List', we can automate it!")
    else:
        print("\n❌ FAILED: Could not find any window named '闲鱼'.")
        print("Please make sure the PC Client is OPEN and Visible.")
        print("Current Top-Level Windows:")
        root = auto.GetRootControl()
        for child in root.GetChildren():
            if child.Name:
                print(f" - {child.Name}")

if __name__ == "__main__":
    probe()
