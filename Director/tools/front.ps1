# Brings the Unity window to the front (Windows only lets a process do that right after a key event).
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
 [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
}
"@
$p = Get-Process Unity | Where-Object { $_.MainWindowTitle -like 'TKShock*' } | Select-Object -First 1
[W]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
[W]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[W]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
[W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 400
$sb = New-Object Text.StringBuilder 200
[W]::GetWindowText([W]::GetForegroundWindow(), $sb, 200) | Out-Null
"foreground: " + $sb.ToString()
