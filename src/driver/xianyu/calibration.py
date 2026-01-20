import pyautogui
import time
import os

def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

print("=== Xianyu Robot Vision Calibrator ===")
print("Move your mouse over the target areas to see their coordinates.")
print("Press Ctrl+C to exit.\n")
print("Target 1: The 'Red Dot' (New Message Badge)")
print("Target 2: The 'Chat Input Box'")
print("------------------------------------------------")

try:
    while True:
        x, y = pyautogui.position()
        pixel_color = pyautogui.screenshot().getpixel((x, y))
        position_str = 'X: ' + str(x).rjust(4) + ' Y: ' + str(y).rjust(4)
        color_str = 'RGB: (' + str(pixel_color[0]).rjust(3) + ', ' + \
                    str(pixel_color[1]).rjust(3) + ', ' + \
                    str(pixel_color[2]).rjust(3) + ')'
        
        print(position_str + " | " + color_str, end='')
        print('\b' * (len(position_str) + len(color_str) + 3), end='', flush=True)
        time.sleep(0.1)
except KeyboardInterrupt:
    print('\nDone.')
