<#
 CareDesk Doctor  (اداة اصلاح CareDesk)
 Stand-alone repair tool. It does NOT depend on CareDesk.exe or app.asar being healthy: the UI, backup, event-log reading, file checks and cache cleaning
 are plain Windows PowerShell + .NET. The optional "deep check" borrows CareDesk.exe as a Node runtime and is simply reported as failed when the exe cannot run.
 Rules: (1) the database is copied to Documents\CareDesk-Doctor-Backups BEFORE anything else, (2) patient data is never deleted or overwritten
 without an explicit confirmation, (3) only cache folders inside %APPDATA%\CareDesk are ever removed.
 Command line (for support):  CareDeskDoctor.ps1 -Cli 2 | -Cli 1 -Code E101 | -Cli 2 -Restore
#>
param([string]$InstallDir = '', [string]$Cli = '', [string]$Code = '', [switch]$Restore)

$ErrorActionPreference = 'Continue'
$script:Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $InstallDir) { $InstallDir = Split-Path -Parent $script:Here }
# WinForms needs a single-threaded apartment (clipboard, rich text). The shortcut passes -STA; if started another way, relaunch ourselves.
if (-not $Cli -and [Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-WindowStyle', 'Hidden', '-File', ('"' + $PSCommandPath + '"'), '-InstallDir', ('"' + $InstallDir + '"')) | Out-Null
  exit
}

$script:Exe = Join-Path $InstallDir 'CareDesk.exe'
$script:AppData = Join-Path $env:APPDATA 'CareDesk'
$script:LogDir = Join-Path $script:AppData 'doctor'
$script:LogFile = Join-Path $script:LogDir ('doctor-' + (Get-Date -Format 'yyyyMMdd') + '.log')
$script:BackupRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'CareDesk-Doctor-Backups'
$script:BackupDir = ''
$script:Lang = if ($Cli) { 'en' } else { 'ar' }
$script:Box = $null
$script:Report = New-Object System.Collections.ArrayList
$script:Counts = @{ ok = 0; warn = 0; fail = 0; fix = 0 }
$script:Actions = @{}
try { New-Item -ItemType Directory -Force -Path $script:LogDir | Out-Null } catch { }

# ------------------------------------------------------------------ texts
$S = @{
  ar = @{
    title = 'CareDesk Doctor — أداة إصلاح CareDesk'; sub = 'اختر وصف المشكلة التي تواجهها'
    opt1 = '١. البرنامج لا يعمل ويظهر رمز خطأ'; opt2 = '٢. البرنامج لا يعمل ولا يظهر أي خطأ (إغلاق صامت)'
    back = 'رجوع'; langbtn = 'English'; close = 'إغلاق'
    code_label = 'اكتب رمز الخطأ أو اختره من القائمة:'; show = 'عرض الشرح والحل'; scanall = 'لا أعرف الرمز — افحص كل شيء'
    sev = 'الخطورة'; sev_low = 'خفيفة'; sev_medium = 'متوسطة'; sev_high = 'عالية'; sev_critical = 'حرجة'
    auto_yes = 'يُصلح التطبيق هذه المشكلة تلقائياً عند «فحص وإصلاح» (Ctrl+Shift+D).'; auto_no = 'تحتاج هذه المشكلة خطوات يدوية:'
    unknown_code = 'رمز غير معروف. تأكد من كتابته (مثل E101) أو استخدم «افحص كل شيء».'
    run = 'بدء الفحص والإصلاح'; launch = 'تشغيل CareDesk'; safe = 'تشغيل بالوضع الآمن'; openbk = 'فتح مجلد النسخ الاحتياطية'; copy = 'نسخ التقرير'
    intro2 = 'ستأخذ الأداة نسخة احتياطية من بياناتك أولاً، ثم تفحص البرنامج وتصلح ما يمكن إصلاحه بأمان. لا يُحذف أي مريض أو جلسة. إن كان CareDesk يعمل في الخلفية سيُغلق أثناء الفحص.'
    done_ok = 'تم الفحص والإصلاح بنجاح. يمكنك الآن تشغيل CareDesk.'; done_warn = 'انتهى الفحص مع ملاحظات. جرّب تشغيل CareDesk، وإن لم يعمل اتبع الخطوات المكتوبة أعلاه.'
    done_fail = 'وُجدت مشكلة لا تُصلح تلقائياً. اتبع الخطوات المكتوبة بالأحمر، وأرسل ملف التقرير للدعم إن احتجت.'
    busy = 'جارٍ العمل… لا تغلق النافذة'
    s_backup = 'نسخ احتياطي للبيانات'; s_proc = 'العمليات الجارية'; s_events = 'سجل أحداث ويندوز'; s_files = 'ملفات البرنامج'; s_data = 'قاعدة البيانات'; s_deep = 'فحص معمّق'; s_cache = 'تنظيف الذاكرة المؤقتة'; s_disk = 'المساحة والصلاحيات'
    nodb = 'لا توجد قاعدة بيانات بعد (تثبيت جديد) — لا شيء للنسخ.'
    bk_ok = 'نُسخت البيانات إلى: {0}'; bk_fail = 'فشل النسخ الاحتياطي ({0}). أُوقف الإصلاح حمايةً لبياناتك.'
    proc_none = 'لا توجد نسخة CareDesk تعمل.'; proc_hang = 'نسخة CareDesk لا تستجيب (PID {0}) — أُغلقت لتبدأ من جديد.'; proc_bg = 'CareDesk يعمل أصلاً في الخلفية (PID {0}). وجوده بلا نافذة هو سبب «لا يفتح». أُغلق ليبدأ نظيفاً.'
    ev_none = 'لا توجد أخطاء تعطّل لـ CareDesk في سجل ويندوز خلال 14 يوماً (قد يكون الإغلاق من داخل البرنامج نفسه).'; ev_found = 'وُجد {0} حدث تعطّل/توقف لـ CareDesk. آخرها: {1} — وحدة: {2} — رمز: {3}'
    ev_cause = 'السبب المحتمل ({0}×): {1}'; ev_unknown = 'تعطّل بسبب غير مصنّف (وحدة {0}، رمز {1}). أرسل ملف التقرير للدعم.'; av_hit = 'برنامج الحماية (Defender) تعامل مع ملف يخص CareDesk مؤخراً — قد يكون حجره: {0}'
    f_missing = 'ملف ناقص: {0} — غالباً حذفه برنامج الحماية أو تلف التثبيت. أعد تثبيت CareDesk (البيانات لا تُحذف).'; f_ok = 'ملفات التشغيل الأساسية سليمة ({0} ملفاً).'; f_noexe = 'لم يُعثر على CareDesk.exe في {0}'
    f_asar = 'ملف app.asar يبدو ناقصاً أو تالفاً ({0}). أعد تثبيت CareDesk.'; f_asar_ok = 'ملف app.asar سليم الهيكل ({0} MB).'
    db_none = 'لم تُعثر قاعدة بيانات.'; db_found = 'قاعدة البيانات: {0} — {1} KB — آخر تعديل {2}'; db_two = 'تنبيه: توجد قاعدتان للبيانات في مكانين. التطبيق يستخدم الأولى المذكورة؛ لا تحذف أياً منهما قبل المراجعة.'
    db_bad = 'قاعدة البيانات تالفة: {0}'; db_trunc = 'حجم قاعدة البيانات لا يطابق بنيتها (ربما انقطع الحفظ): {0}'; db_ok = 'ترويسة قاعدة البيانات سليمة.'
    db_locked = 'قاعدة البيانات مقفلة من برنامج آخر. أغلق أي نسخة من CareDesk أو أي برنامج يفتح الملف ثم أعد المحاولة.'; db_unlocked = 'قاعدة البيانات غير مقفلة.'
    db_wal = 'بقايا ملفات حفظ مؤقتة (wal/journal) — طبيعية بعد إغلاق مفاجئ، وSQLite يستعيدها تلقائياً عند الفتح. لم تُلمس.'
    rs_found = 'نسخة سليمة متاحة للاستعادة: {0} ({1})'; rs_ask = 'قاعدة البيانات الحالية تالفة.`nهل تريد استعادة آخر نسخة سليمة؟`n`n{0}`n`n(التالفة محفوظة في مجلد النسخ الاحتياطية)'; rs_done = 'استُعيدت النسخة السليمة. التالفة محفوظة في: {0}'; rs_none = 'لا توجد نسخة سليمة للاستعادة. لا تحذف أي ملف وأرسل مجلد النسخ الاحتياطية للدعم.'; rs_hint = 'شغّل الأداة بالخيار -Restore لاستعادة النسخة السليمة.'
    dp_start = 'بدء الفحص المعمّق بمحرك CareDesk نفسه…'; dp_nort = 'تعذّر تشغيل CareDesk.exe كمحرك فحص (رمز الخروج {0}). هذا يعني أن ملف البرنامج أو مكتبة تابعة له لا تعمل — أعد تثبيت CareDesk.'; dp_timeout = 'انتهت مهلة الفحص المعمّق.'; dp_skip = 'تُجوِّز الفحص المعمّق: CareDesk.exe غير موجود.'
    cache_ok = 'نُظِّفت الذاكرة المؤقتة: {0}'; cache_none = 'لا ذاكرة مؤقتة تحتاج تنظيفاً.'
    disk_low = 'المساحة الحرة على القرص قليلة ({0} MB). امسح بعض الملفات؛ نقص المساحة يمنع حفظ البيانات.'; disk_ok = 'المساحة الحرة كافية ({0} MB).'; w_bad = 'مجلد البيانات غير قابل للكتابة: {0} — سيلجأ التطبيق لمجلد آخر وقد تبدو بياناتك «فارغة».'
    st_launch = 'جارٍ تشغيل CareDesk…'; st_up = 'CareDesk يعمل الآن.'; st_closed = 'أُغلق CareDesk مباشرةً. أحاول بالوضع الآمن…'; st_fail = 'لا يزال يُغلق حتى بالوضع الآمن. أرسل ملف التقرير: {0}'
    report_saved = 'مسار التقرير: {0}'; copied = 'تم نسخ التقرير'; sum = 'الملخص: {0} سليم، {1} تنبيه، {2} مشكلة، {3} إصلاح'
    act_reinstall = 'الإجراء المقترح: أعد تثبيت CareDesk من الملف الرسمي (لا يحذف بياناتك).'; act_safe = 'الإجراء المقترح: جرّب «تشغيل بالوضع الآمن».'
    err_gui = 'حدث خطأ غير متوقع في الأداة: {0}'
  }
  en = @{
    title = 'CareDesk Doctor — repair tool'; sub = 'Choose the problem you are facing'
    opt1 = '1. The app does not work and shows an error code'; opt2 = '2. The app does not work and shows NO error (silent crash)'
    back = 'Back'; langbtn = 'عربي'; close = 'Close'
    code_label = 'Type the error code or pick it from the list:'; show = 'Show explanation & fix'; scanall = 'I do not know the code — check everything'
    sev = 'Severity'; sev_low = 'Low'; sev_medium = 'Medium'; sev_high = 'High'; sev_critical = 'Critical'
    auto_yes = 'The app repairs this by itself with "Scan & repair" (Ctrl+Shift+D).'; auto_no = 'This needs manual steps:'
    unknown_code = 'Unknown code. Check the spelling (e.g. E101) or use "check everything".'
    run = 'Start check & repair'; launch = 'Launch CareDesk'; safe = 'Launch in Safe mode'; openbk = 'Open backups folder'; copy = 'Copy report'
    intro2 = 'The tool first copies your data to a safe folder, then checks the program and repairs only what is safe to repair. No patient or session is ever deleted. If CareDesk is running in the background it is closed during the check.'
    done_ok = 'Check and repair finished successfully. You can launch CareDesk now.'; done_warn = 'Finished with notes. Try launching CareDesk; if it still fails follow the steps listed above.'
    done_fail = 'A problem was found that cannot be repaired automatically. Follow the steps in red and send the report file to support if needed.'
    busy = 'Working… do not close the window'
    s_backup = 'Data backup'; s_proc = 'Running processes'; s_events = 'Windows event log'; s_files = 'Program files'; s_data = 'Database'; s_deep = 'Deep check'; s_cache = 'Cache cleaning'; s_disk = 'Disk space & permissions'
    nodb = 'No database yet (fresh install) — nothing to back up.'
    bk_ok = 'Data copied to: {0}'; bk_fail = 'Backup failed ({0}). Repair stopped to protect your data.'
    proc_none = 'No CareDesk process is running.'; proc_hang = 'CareDesk is not responding (PID {0}) — closed so it can start fresh.'; proc_bg = 'CareDesk is already running in the background (PID {0}). A running instance with no window is exactly why it "does not open". Closed so it starts clean.'
    ev_none = 'No CareDesk crash events in the Windows log for 14 days (the app may be closing itself).'; ev_found = 'Found {0} crash/hang event(s) for CareDesk. Latest: {1} — module: {2} — code: {3}'
    ev_cause = 'Likely cause ({0}x): {1}'; ev_unknown = 'Crash with an unclassified cause (module {0}, code {1}). Send the report file to support.'; av_hit = 'Windows Defender recently acted on a CareDesk file — it may have quarantined it: {0}'
    f_missing = 'Missing file: {0} — usually removed by antivirus or a damaged install. Reinstall CareDesk (data is kept).'; f_ok = 'Core runtime files are present ({0} files).'; f_noexe = 'CareDesk.exe not found in {0}'
    f_asar = 'app.asar looks truncated or damaged ({0}). Reinstall CareDesk.'; f_asar_ok = 'app.asar structure is fine ({0} MB).'
    db_none = 'No database found.'; db_found = 'Database: {0} — {1} KB — modified {2}'; db_two = 'Notice: two databases exist in two places. The app uses the first one listed; do not delete either before reviewing.'
    db_bad = 'Database is damaged: {0}'; db_trunc = 'Database size does not match its structure (a save may have been cut): {0}'; db_ok = 'Database header is valid.'
    db_locked = 'The database is locked by another program. Close any CareDesk instance or program holding the file and retry.'; db_unlocked = 'Database is not locked.'
    db_wal = 'Leftover temporary save files (wal/journal) — normal after a sudden shutdown; SQLite recovers them on open. Not touched.'
    rs_found = 'A healthy copy is available to restore: {0} ({1})'; rs_ask = 'The current database is damaged.`nRestore the latest healthy copy?`n`n{0}`n`n(The damaged one is kept in the backups folder)'; rs_done = 'Healthy copy restored. The damaged one is kept in: {0}'; rs_none = 'No healthy copy is available. Do not delete anything and send the backups folder to support.'; rs_hint = 'Run the tool with -Restore to restore the healthy copy.'
    dp_start = 'Starting deep check with CareDesk''s own runtime…'; dp_nort = 'CareDesk.exe could not run as a check engine (exit code {0}). The program file or one of its libraries is not working — reinstall CareDesk.'; dp_timeout = 'The deep check timed out.'; dp_skip = 'Deep check skipped: CareDesk.exe not found.'
    cache_ok = 'Cache cleaned: {0}'; cache_none = 'No cache needed cleaning.'
    disk_low = 'Free disk space is low ({0} MB). Free some space; a full disk prevents saving data.'; disk_ok = 'Free disk space is fine ({0} MB).'; w_bad = 'Data folder is not writable: {0} — the app falls back to another folder and your data may look "empty".'
    st_launch = 'Launching CareDesk…'; st_up = 'CareDesk is running.'; st_closed = 'CareDesk closed immediately. Trying Safe mode…'; st_fail = 'It still closes, even in Safe mode. Send the report file: {0}'
    report_saved = 'Report file: {0}'; copied = 'Report copied'; sum = 'Summary: {0} ok, {1} notes, {2} problems, {3} repairs'
    act_reinstall = 'Suggested action: reinstall CareDesk from the official installer (keeps your data).'; act_safe = 'Suggested action: try "Launch in Safe mode".'
    err_gui = 'Unexpected tool error: {0}'
  }
}
function T([string]$k) { $v = $S[$script:Lang][$k]; if ($null -eq $v) { $v = $S['en'][$k] }; if ($null -eq $v) { $v = $k }; return $v }

# ------------------------------------------------------------------ logging
function Log([string]$level, [string]$text) {
  $null = $script:Report.Add(('[' + $level.ToUpper() + '] ' + $text))
  if ($script:Counts.ContainsKey($level)) { $script:Counts[$level] = $script:Counts[$level] + 1 }
  try { Add-Content -LiteralPath $script:LogFile -Value ((Get-Date -Format 'HH:mm:ss') + ' [' + $level + '] ' + $text) -Encoding UTF8 } catch { }
  if ($script:Box) {
    $col = switch ($level) { 'ok' { 'LightGreen' } 'warn' { 'Orange' } 'fail' { 'Tomato' } 'fix' { 'Cyan' } 'head' { 'White' } default { 'Silver' } }
    $mark = switch ($level) { 'ok' { [string][char]0x2714 + ' ' } 'warn' { [string][char]0x26A0 + ' ' } 'fail' { [string][char]0x2716 + ' ' } 'fix' { [string][char]0x2692 + ' ' } 'head' { '' } default { '  ' } }
    $script:Box.SelectionStart = $script:Box.TextLength; $script:Box.SelectionColor = [System.Drawing.Color]::FromName($col)
    if ($level -eq 'head') { $script:Box.SelectionFont = New-Object System.Drawing.Font($script:Box.Font, [System.Drawing.FontStyle]::Bold) } else { $script:Box.SelectionFont = $script:Box.Font }
    $script:Box.AppendText($mark + $text + "`r`n"); $script:Box.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
  } else {
    $c = switch ($level) { 'ok' { 'Green' } 'warn' { 'Yellow' } 'fail' { 'Red' } 'fix' { 'Cyan' } 'head' { 'White' } default { 'Gray' } }
    Write-Host ('[' + $level + '] ' + $text) -ForegroundColor $c
  }
}
function Pump { if ($script:Box) { [System.Windows.Forms.Application]::DoEvents() } }
function Sleep-Pump([int]$ms) { $end = (Get-Date).AddMilliseconds($ms); while ((Get-Date) -lt $end) { Start-Sleep -Milliseconds 100; Pump } }

# ------------------------------------------------------------------ helpers
function Open-Shared([string]$path) { return [System.IO.File]::Open($path, 'Open', 'Read', 'ReadWrite') } # FileShare.ReadWrite: readable while CareDesk has it open
function Copy-Shared([string]$src, [string]$dst) {
  try {
    $in = Open-Shared $src
    try { $out = [System.IO.File]::Create($dst); try { $in.CopyTo($out) } finally { $out.Dispose() } } finally { $in.Dispose() }
    return $true
  } catch { return $false }
}
function Test-Writable([string]$dir) {
  try { $t = Join-Path $dir ('.doctor-' + [guid]::NewGuid().ToString('N')); [System.IO.File]::WriteAllText($t, 'x'); Remove-Item -LiteralPath $t -Force; return $true } catch { return $false }
}
# the app keeps its data in <install>\data when that folder is writable, otherwise in %APPDATA%\CareDesk\data
function Get-DbCandidates {
  $list = @()
  foreach ($d in @((Join-Path $InstallDir 'data'), (Join-Path $script:AppData 'data'))) {
    $f = Join-Path $d 'caredesk.sqlite'
    if (Test-Path -LiteralPath $f) { $list += $f }
  }
  return $list
}
function Test-DbHeader([string]$path) {
  try {
    $fs = Open-Shared $path
    try {
      $len = $fs.Length; $buf = New-Object byte[] 100; $n = $fs.Read($buf, 0, 100)
    } finally { $fs.Dispose() }
    if ($len -eq 0) { return @{ ok = $false; msg = 'empty file' } }
    if ($n -lt 100 -or [System.Text.Encoding]::ASCII.GetString($buf, 0, 15) -ne 'SQLite format 3') { return @{ ok = $false; msg = 'not a SQLite file (bad header)' } }
    $ps = ([int]$buf[16] * 256) + [int]$buf[17]; if ($ps -eq 1) { $ps = 65536 }
    if ($ps -lt 512 -or ($len % $ps) -ne 0) { return @{ ok = $true; trunc = $true; msg = ('size ' + $len + ' is not a multiple of the page size ' + $ps) } }
    return @{ ok = $true; msg = '' }
  } catch { return @{ ok = $false; msg = $_.Exception.Message } }
}
function Test-Locked([string]$path) {
  try { $fs = [System.IO.File]::Open($path, 'Open', 'ReadWrite', 'None'); $fs.Dispose(); return $false } catch [System.IO.IOException] { return $true } catch { return $false }
}

# ------------------------------------------------------------------ steps
function Step-Backup {
  Log 'head' (T 's_backup')
  $dbs = @(Get-DbCandidates)
  if ($dbs.Count -eq 0) { Log 'info' (T 'nodb'); return $true }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $dest = Join-Path $script:BackupRoot $stamp
  try { New-Item -ItemType Directory -Force -Path $dest | Out-Null } catch { Log 'fail' ((T 'bk_fail') -f $_.Exception.Message); return $false }
  $i = 0
  foreach ($db in $dbs) {
    $i++; $sub = Join-Path $dest ('db' + $i); New-Item -ItemType Directory -Force -Path $sub | Out-Null
    foreach ($suffix in @('', '-wal', '-shm', '-journal')) {
      $src = $db + $suffix
      if (Test-Path -LiteralPath $src) {
        if (-not (Copy-Shared $src (Join-Path $sub ([System.IO.Path]::GetFileName($src))))) { Log 'fail' ((T 'bk_fail') -f $src); return $false }
      }
    }
    Set-Content -LiteralPath (Join-Path $sub 'ORIGIN.txt') -Value $db -Encoding UTF8
    $copy = Join-Path $sub 'caredesk.sqlite'
    if (-not (Test-Path -LiteralPath $copy) -or ((Get-Item -LiteralPath $copy).Length -lt ((Get-Item -LiteralPath $db).Length - 4096) -and -not (Test-Path -LiteralPath ($db + '-wal')))) { Log 'fail' ((T 'bk_fail') -f 'size mismatch'); return $false }
  }
  $script:BackupDir = $dest
  Log 'ok' ((T 'bk_ok') -f $dest)
  return $true
}
function Step-Processes {
  Log 'head' (T 's_proc')
  $procs = @(Get-Process -Name 'CareDesk' -ErrorAction SilentlyContinue)
  if ($procs.Count -eq 0) { Log 'ok' (T 'proc_none'); return }
  foreach ($p in $procs) {
    $hung = $false; try { $hung = -not $p.Responding } catch { }
    if ($hung) { Log 'fix' ((T 'proc_hang') -f $p.Id) } else { Log 'fix' ((T 'proc_bg') -f $p.Id) }
    try { Stop-Process -Id $p.Id -Force -ErrorAction Stop } catch { Log 'warn' $_.Exception.Message }
  }
  Sleep-Pump 1500
}
function Step-Events {
  Log 'head' (T 's_events')
  $since = (Get-Date).AddDays(-14); $recs = @()
  try {
    $ev = @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Id = @(1000, 1001, 1002, 1026); StartTime = $since } -MaxEvents 400 -ErrorAction Stop)
    foreach ($e in $ev) {
      $p = $e.Properties; $rec = $null
      if ($e.Id -eq 1000 -and $p.Count -ge 7 -and ('' + $p[0].Value) -like 'CareDesk*') {
        $rec = @{ kind = 'crash'; time = $e.TimeCreated; module = ('' + $p[3].Value); code = ('' + $p[6].Value); path = $(if ($p.Count -gt 11) { '' + $p[11].Value } else { '' }) }
      } elseif ($e.Id -eq 1002 -and $p.Count -ge 1 -and ('' + $p[0].Value) -like 'CareDesk*') {
        $rec = @{ kind = 'hang'; time = $e.TimeCreated; module = ''; code = ''; path = '' }
      } elseif (($e.Id -eq 1001 -or $e.Id -eq 1026) -and $e.Message -match 'CareDesk') {
        $rec = @{ kind = 'report'; time = $e.TimeCreated; module = ''; code = ''; path = '' }
      }
      if ($rec) { $recs += $rec }
    }
  } catch { }
  if ($recs.Count -eq 0) { Log 'info' (T 'ev_none') } else {
    $last = $recs[0]
    Log 'warn' ((T 'ev_found') -f $recs.Count, $last.time.ToString('yyyy-MM-dd HH:mm'), $last.module, $last.code)
    $patterns = @(); try { $patterns = @(Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $script:Here 'crash-patterns.json') | ConvertFrom-Json) } catch { }
    $hits = @{}; $unknown = 0
    foreach ($r in $recs) {
      if ($r.kind -eq 'report') { continue }
      $line = 'kind=' + $r.kind + '; module=' + $r.module + '; code=' + $r.code + '; path=' + $r.path; $hit = $null
      foreach ($pt in $patterns) { if ($line -match $pt.test) { $hit = $pt; break } }
      if ($hit) { if ($hits.ContainsKey($hit.id)) { $hits[$hit.id].n++ } else { $hits[$hit.id] = @{ n = 1; p = $hit } } } else { $unknown++ }
    }
    foreach ($k in $hits.Keys) {
      $h = $hits[$k]; $p = $h.p
      Log 'fail' ((T 'ev_cause') -f $h.n, $(if ($script:Lang -eq 'ar') { $p.ar } else { $p.en }))
      foreach ($st in $(if ($script:Lang -eq 'ar') { $p.steps_ar } else { $p.steps_en })) { Log 'info' ('   - ' + $st) }
      $script:Actions[$p.action] = $true
    }
    if ($unknown -gt 0) { Log 'warn' ((T 'ev_unknown') -f $last.module, $last.code) }
  }
  try {
    $d = @(Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Windows Defender/Operational'; Id = @(1116, 1117); StartTime = $since } -MaxEvents 40 -ErrorAction Stop | Where-Object { $_.Message -match 'CareDesk' })
    if ($d.Count -gt 0) { Log 'warn' ((T 'av_hit') -f $d[0].TimeCreated.ToString('yyyy-MM-dd HH:mm')); $script:Actions['reinstall'] = $true }
  } catch { }
}
function Step-Files {
  Log 'head' (T 's_files')
  if (-not (Test-Path -LiteralPath $script:Exe)) { Log 'fail' ((T 'f_noexe') -f $InstallDir); $script:Actions['reinstall'] = $true; return }
  $need = @('CareDesk.exe', 'ffmpeg.dll', 'libEGL.dll', 'libGLESv2.dll', 'resources.pak', 'icudtl.dat', 'resources\app.asar')
  $optional = @('d3dcompiler_47.dll', 'v8_context_snapshot.bin')
  $missing = 0
  foreach ($f in $need) { $p = Join-Path $InstallDir $f; if (-not (Test-Path -LiteralPath $p) -or (Get-Item -LiteralPath $p).Length -eq 0) { Log 'fail' ((T 'f_missing') -f $f); $missing++; $script:Actions['reinstall'] = $true } }
  foreach ($f in $optional) { if (-not (Test-Path -LiteralPath (Join-Path $InstallDir $f))) { Log 'warn' ((T 'f_missing') -f $f) } }
  if ($missing -eq 0) { Log 'ok' ((T 'f_ok') -f $need.Count) }
  $asar = Join-Path $InstallDir 'resources\app.asar'
  if (Test-Path -LiteralPath $asar) {
    try {
      $fs = Open-Shared $asar
      try {
        $len = $fs.Length; $b = New-Object byte[] 24; $n = $fs.Read($b, 0, 24)
        $jsonLen = [BitConverter]::ToUInt32($b, 12); $hdr = [BitConverter]::ToUInt32($b, 4); $json = [System.Text.Encoding]::ASCII.GetString($b, 16, 8)
      } finally { $fs.Dispose() }
      if ($n -lt 24 -or $json -ne '{"files"' -or ($hdr + 8) -gt $len -or $jsonLen -lt 2 -or ($jsonLen + 16) -gt $len) { Log 'fail' ((T 'f_asar') -f ('size ' + $len)); $script:Actions['reinstall'] = $true }
      else { Log 'ok' ((T 'f_asar_ok') -f [math]::Round($len / 1MB, 1)) }
    } catch { Log 'warn' ((T 'f_asar') -f $_.Exception.Message) }
  }
}
function Find-GoodCopies([string]$exclude) {
  $c = @()
  foreach ($d in @((Join-Path $InstallDir 'data\safety'), (Join-Path $script:AppData 'data\safety'))) {
    if (Test-Path -LiteralPath $d) { $c += @(Get-ChildItem -LiteralPath $d -Filter 'before-repair-*.db' -File -ErrorAction SilentlyContinue) }
  }
  $ub = Join-Path $script:AppData 'update-backup\caredesk.sqlite'; if (Test-Path -LiteralPath $ub) { $c += @(Get-Item -LiteralPath $ub) }
  if (Test-Path -LiteralPath $script:BackupRoot) {
    foreach ($b in @(Get-ChildItem -LiteralPath $script:BackupRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 15)) {
      if ($script:BackupDir -and $b.FullName -eq $script:BackupDir) { continue }
      $c += @(Get-ChildItem -LiteralPath $b.FullName -Filter 'caredesk.sqlite' -File -Recurse -ErrorAction SilentlyContinue)
    }
  }
  $good = @()
  foreach ($f in ($c | Sort-Object LastWriteTime -Descending)) { $h = Test-DbHeader $f.FullName; if ($h.ok -and -not $h.trunc -and $f.Length -gt 0) { $good += $f } }
  return $good
}
function Restore-Db([string]$db) {
  $good = @(Find-GoodCopies '')
  if ($good.Count -eq 0) { Log 'fail' (T 'rs_none'); return }
  $pick = $good[0]; $desc = $pick.FullName + ' — ' + $pick.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
  Log 'info' ((T 'rs_found') -f $pick.FullName, $pick.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))
  $yes = $Restore.IsPresent
  if ($script:Box) { $yes = ([System.Windows.Forms.MessageBox]::Show((((T 'rs_ask') -f $desc).Replace('`n', [Environment]::NewLine)), 'CareDesk Doctor', 'YesNo', 'Warning') -eq 'Yes') }
  if (-not $yes) { if (-not $script:Box) { Log 'warn' (T 'rs_hint') }; return }
  try {
    foreach ($suffix in @('-wal', '-shm', '-journal')) { if (Test-Path -LiteralPath ($db + $suffix)) { Remove-Item -LiteralPath ($db + $suffix) -Force } } # they belong to the damaged file; it is already in the backup
    Copy-Item -LiteralPath $pick.FullName -Destination $db -Force
    Log 'fix' ((T 'rs_done') -f $script:BackupDir)
  } catch { Log 'fail' $_.Exception.Message }
}
function Step-Data {
  Log 'head' (T 's_data')
  $dbs = @(Get-DbCandidates)
  if ($dbs.Count -eq 0) { Log 'info' (T 'db_none'); return }
  if ($dbs.Count -gt 1) { Log 'warn' (T 'db_two') }
  foreach ($db in $dbs) {
    $it = Get-Item -LiteralPath $db
    Log 'info' ((T 'db_found') -f $db, [math]::Round($it.Length / 1KB), $it.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))
    if (Test-Locked $db) { Log 'fail' (T 'db_locked') } else { Log 'ok' (T 'db_unlocked') }
    if ((Test-Path -LiteralPath ($db + '-wal')) -or (Test-Path -LiteralPath ($db + '-journal'))) { Log 'info' (T 'db_wal') }
    $h = Test-DbHeader $db
    if (-not $h.ok) { Log 'fail' ((T 'db_bad') -f $h.msg); Restore-Db $db }
    elseif ($h.trunc) { Log 'warn' ((T 'db_trunc') -f $h.msg) }
    else { Log 'ok' (T 'db_ok') }
  }
}
function Step-Deep {
  Log 'head' (T 's_deep')
  if (-not (Test-Path -LiteralPath $script:Exe)) { Log 'warn' (T 'dp_skip'); return }
  $js = Join-Path $script:Here 'deep-check.js'; if (-not (Test-Path -LiteralPath $js)) { return }
  $dbCopy = ''
  if ($script:BackupDir) { $c = @(Get-ChildItem -LiteralPath $script:BackupDir -Filter 'caredesk.sqlite' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1); if ($c.Count -gt 0) { $dbCopy = $c[0].FullName } } # checks the COPY, never the live file
  Log 'info' (T 'dp_start')
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $script:Exe
    $psi.Arguments = '"' + $js + '" --install "' + $InstallDir + '"' + $(if ($dbCopy) { ' --db "' + $dbCopy + '"' } else { '' })
    $psi.UseShellExecute = $false; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true; $psi.CreateNoWindow = $true
    $psi.EnvironmentVariables['ELECTRON_RUN_AS_NODE'] = '1'
    $p = [System.Diagnostics.Process]::Start($psi)
    $so = $p.StandardOutput.ReadToEndAsync(); $se = $p.StandardError.ReadToEndAsync()
    $t0 = Get-Date
    while (-not $p.HasExited -and ((Get-Date) - $t0).TotalSeconds -lt 45) { Start-Sleep -Milliseconds 150; Pump }
    if (-not $p.HasExited) { try { $p.Kill() } catch { }; Log 'warn' (T 'dp_timeout'); return }
    $txt = ('' + $so.Result).Trim()
    if ($p.ExitCode -ne 0 -or -not $txt.StartsWith('{')) { Log 'fail' ((T 'dp_nort') -f ('0x{0:X8}' -f $p.ExitCode)); $script:Actions['reinstall'] = $true; return }
    $res = $txt | ConvertFrom-Json
    foreach ($r in @($res.results)) {
      $line = ('' + $r.check) + $(if ($r.detail) { ': ' + $r.detail } else { '' })
      if ($r.status -eq 'ok') { Log 'ok' $line } elseif ($r.status -eq 'warn') { Log 'warn' $line } else {
        Log 'fail' $line
        if ($r.check -eq 'database integrity') { $dbs = @(Get-DbCandidates); if ($dbs.Count -gt 0) { Restore-Db $dbs[0] } } else { $script:Actions['reinstall'] = $true }
      }
    }
  } catch { Log 'fail' ((T 'dp_nort') -f $_.Exception.Message); $script:Actions['reinstall'] = $true }
}
function Step-Cache {
  Log 'head' (T 's_cache')
  $names = @('Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'GrShaderCache', 'ShaderCache')
  $done = @()
  foreach ($n in $names) {
    $p = Join-Path $script:AppData $n
    if (Test-Path -LiteralPath $p) { try { Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction Stop; $done += $n } catch { Log 'warn' $_.Exception.Message } }
  }
  if ($done.Count -gt 0) { Log 'fix' ((T 'cache_ok') -f ($done -join ', ')) } else { Log 'info' (T 'cache_none') }
}
function Step-Disk {
  Log 'head' (T 's_disk')
  try {
    $root = [System.IO.Path]::GetPathRoot($InstallDir); $di = New-Object System.IO.DriveInfo($root); $mb = [math]::Round($di.AvailableFreeSpace / 1MB)
    if ($mb -lt 500) { Log 'fail' ((T 'disk_low') -f $mb) } else { Log 'ok' ((T 'disk_ok') -f $mb) }
  } catch { }
  $dd = Join-Path $InstallDir 'data'; if (Test-Path -LiteralPath $dd) { if (-not (Test-Writable $dd)) { Log 'warn' ((T 'w_bad') -f $dd) } }
}
function Run-Silent {
  $script:Counts = @{ ok = 0; warn = 0; fail = 0; fix = 0 }; $script:Actions = @{}; $script:Report.Clear()
  if (-not (Step-Backup)) { return 'stop' }   # nothing else happens unless the backup succeeded
  Step-Processes; Step-Events; Step-Files; Step-Data; Step-Deep; Step-Cache; Step-Disk
  if ($script:Actions['reinstall']) { Log 'fail' (T 'act_reinstall') } elseif ($script:Actions['safe']) { Log 'warn' (T 'act_safe') }
  Log 'info' ((T 'sum') -f $script:Counts.ok, $script:Counts.warn, $script:Counts.fail, $script:Counts.fix)
  Log 'info' ((T 'report_saved') -f $script:LogFile)
  if ($script:Counts.fail -gt 0) { return 'fail' } elseif ($script:Counts.warn -gt 0) { return 'warn' } else { return 'ok' }
}
function Start-CareDesk([bool]$safeMode) {
  if (-not (Test-Path -LiteralPath $script:Exe)) { Log 'fail' ((T 'f_noexe') -f $InstallDir); return }
  Log 'info' (T 'st_launch')
  try { if ($safeMode) { Start-Process -FilePath $script:Exe -ArgumentList '--safe' -WorkingDirectory $InstallDir } else { Start-Process -FilePath $script:Exe -WorkingDirectory $InstallDir } } catch { Log 'fail' $_.Exception.Message; return }
  Sleep-Pump 7000
  $alive = @(Get-Process -Name 'CareDesk' -ErrorAction SilentlyContinue)
  if ($alive.Count -gt 0) { Log 'ok' (T 'st_up'); return }
  if (-not $safeMode) { Log 'warn' (T 'st_closed'); Start-CareDesk $true } else { Log 'fail' ((T 'st_fail') -f $script:LogFile) }
}
function Show-Code([string]$raw) {
  $code = ('' + $raw).Trim().ToUpper(); if ($code -match '^(E\d+)') { $code = $Matches[1] }
  $cat = @(); try { $cat = @(Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $script:Here 'catalog.json') | ConvertFrom-Json) } catch { }
  $e = $cat | Where-Object { $_.code -eq $code } | Select-Object -First 1
  if (-not $e) { Log 'warn' (T 'unknown_code'); return }
  $ar = ($script:Lang -eq 'ar')
  Log 'head' ($e.code + '  ' + $(if ($ar) { $e.ar } else { $e.en }))
  Log 'info' ((T 'sev') + ': ' + (T ('sev_' + $e.sev)))
  if ($e.auto) { Log 'ok' (T 'auto_yes') } else { Log 'warn' (T 'auto_no') }
  $n = 0; foreach ($st in $(if ($ar) { $e.steps_ar } else { $e.steps_en })) { $n++; Log 'info' ('   ' + $n + '. ' + $st) }
}

# ------------------------------------------------------------------ command line mode
if ($Cli) {
  if ($Cli -eq '1') { Show-Code $Code } else { $r = Run-Silent; Write-Host ('RESULT: ' + $r) }
  exit
}

# ------------------------------------------------------------------ GUI
try {
  Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing
  [System.Windows.Forms.Application]::EnableVisualStyles()
  $bg = [System.Drawing.ColorTranslator]::FromHtml('#051F20'); $surf = [System.Drawing.ColorTranslator]::FromHtml('#0B2B26'); $acc = [System.Drawing.ColorTranslator]::FromHtml('#235347'); $fg = [System.Drawing.ColorTranslator]::FromHtml('#DAF1DE'); $hi = [System.Drawing.ColorTranslator]::FromHtml('#8EB69B')
  $font = New-Object System.Drawing.Font('Segoe UI', 10.5); $big = New-Object System.Drawing.Font('Segoe UI Semibold', 13)
  $form = New-Object System.Windows.Forms.Form
  $form.Size = New-Object System.Drawing.Size(820, 640); $form.MinimumSize = New-Object System.Drawing.Size(700, 520); $form.StartPosition = 'CenterScreen'
  $form.BackColor = $bg; $form.ForeColor = $fg; $form.Font = $font; $form.RightToLeft = 'Yes'
  try { $ico = Join-Path $script:Here 'doctor.ico'; if (Test-Path -LiteralPath $ico) { $form.Icon = New-Object System.Drawing.Icon($ico) } } catch { }
  $U = @{}
  function New-Btn([string]$key, [int]$h = 40) {
    $b = New-Object System.Windows.Forms.Button; $b.FlatStyle = 'Flat'; $b.BackColor = $acc; $b.ForeColor = $fg; $b.Height = $h; $b.Dock = 'Top'; $b.Cursor = 'Hand'
    $b.FlatAppearance.BorderColor = $hi; $b.FlatAppearance.BorderSize = 1; $b.Tag = $key; $b.Margin = New-Object System.Windows.Forms.Padding(0, 6, 0, 6); return $b
  }
  function New-Page { $p = New-Object System.Windows.Forms.Panel; $p.Dock = 'Fill'; $p.Padding = New-Object System.Windows.Forms.Padding(22); $p.Visible = $false; $p.BackColor = $bg; return $p }
  function Spacer([int]$h = 10) { $s = New-Object System.Windows.Forms.Panel; $s.Height = $h; $s.Dock = 'Top'; return $s }
  function New-Log { $r = New-Object System.Windows.Forms.RichTextBox; $r.ReadOnly = $true; $r.BackColor = $surf; $r.ForeColor = $fg; $r.BorderStyle = 'None'; $r.Dock = 'Fill'; $r.Font = New-Object System.Drawing.Font('Segoe UI', 10); $r.RightToLeft = 'Inherit'; return $r }

  # --- pages
  $pgHome = New-Page; $p1 = New-Page; $p2 = New-Page
  # home (controls are added bottom-to-top because Dock=Top stacks in reverse add order)
  $U.langHome = New-Btn 'langbtn' 34; $U.langHome.Dock = 'Bottom'
  $U.closeHome = New-Btn 'close' 34; $U.closeHome.Dock = 'Bottom'
  $U.opt2 = New-Btn 'opt2' 84; $U.opt2.Font = $big
  $U.opt1 = New-Btn 'opt1' 84; $U.opt1.Font = $big
  $U.sub = New-Object System.Windows.Forms.Label; $U.sub.Dock = 'Top'; $U.sub.Height = 40; $U.sub.Tag = 'sub'; $U.sub.ForeColor = $hi
  $U.title = New-Object System.Windows.Forms.Label; $U.title.Dock = 'Top'; $U.title.Height = 52; $U.title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 18); $U.title.Tag = 'title'
  foreach ($c in @($U.langHome, $U.closeHome, $U.opt2, (Spacer 10), $U.opt1, (Spacer 12), $U.sub, $U.title)) { $pgHome.Controls.Add($c) }

  # page 1: error code
  $U.back1 = New-Btn 'back' 34; $U.back1.Dock = 'Bottom'
  $U.log1 = New-Log
  $U.scan1 = New-Btn 'scanall' 34
  $U.show = New-Btn 'show' 38
  $U.combo = New-Object System.Windows.Forms.ComboBox; $U.combo.Dock = 'Top'; $U.combo.DropDownStyle = 'DropDown'; $U.combo.RightToLeft = 'No'; $U.combo.Font = $big; $U.combo.BackColor = $surf; $U.combo.ForeColor = $fg
  try { foreach ($e in @(Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $script:Here 'catalog.json') | ConvertFrom-Json)) { [void]$U.combo.Items.Add($e.code + ' — ' + $e.en) } } catch { }
  $U.codeLbl = New-Object System.Windows.Forms.Label; $U.codeLbl.Dock = 'Top'; $U.codeLbl.Height = 30; $U.codeLbl.Tag = 'code_label'
  foreach ($c in @($U.log1, $U.back1, $U.scan1, (Spacer 8), $U.show, (Spacer 8), $U.combo, (Spacer 6), $U.codeLbl)) { $p1.Controls.Add($c) }
  $U.log1.BringToFront()

  # page 2: silent crash
  $U.back2 = New-Btn 'back' 34; $U.back2.Dock = 'Bottom'
  $U.bar = New-Object System.Windows.Forms.FlowLayoutPanel; $U.bar.Dock = 'Bottom'; $U.bar.Height = 80; $U.bar.WrapContents = $true; $U.bar.AutoScroll = $false
  $U.launch = New-Btn 'launch' 34; $U.safe = New-Btn 'safe' 34; $U.openbk = New-Btn 'openbk' 34; $U.copy = New-Btn 'copy' 34
  foreach ($b in @($U.launch, $U.safe, $U.openbk, $U.copy)) { $b.Dock = 'None'; $b.Width = 180; $b.Margin = New-Object System.Windows.Forms.Padding(3); $U.bar.Controls.Add($b) }
  $U.launch.Enabled = $false; $U.safe.Enabled = $false
  $U.result = New-Object System.Windows.Forms.Label; $U.result.Dock = 'Bottom'; $U.result.Height = 36; $U.result.Font = $big; $U.result.Text = ''
  $U.log2 = New-Log
  $U.run = New-Btn 'run' 44; $U.run.Font = $big
  $U.intro = New-Object System.Windows.Forms.Label; $U.intro.Dock = 'Top'; $U.intro.Height = 70; $U.intro.Tag = 'intro2'; $U.intro.ForeColor = $hi
  foreach ($c in @($U.log2, $U.result, $U.bar, $U.back2, $U.run, (Spacer 8), $U.intro)) { $p2.Controls.Add($c) }
  $U.log2.BringToFront()

  foreach ($pg in @($pgHome, $p1, $p2)) { $form.Controls.Add($pg) }
  function Show-Page($pg) { foreach ($x in @($pgHome, $p1, $p2)) { $x.Visible = ($x -eq $pg) } }
  function Apply-Lang {
    $form.Text = T 'title'; $isAr = ($script:Lang -eq 'ar'); $form.RightToLeft = $(if ($isAr) { 'Yes' } else { 'No' })
    foreach ($c in $U.Values) { if ($c.Tag) { $c.Text = T ('' + $c.Tag) } }
    $U.codeLbl.Text = T 'code_label'
  }
  $U.langHome.Add_Click({ $script:Lang = $(if ($script:Lang -eq 'ar') { 'en' } else { 'ar' }); Apply-Lang })
  $U.closeHome.Add_Click({ $form.Close() })
  $U.opt1.Add_Click({ Show-Page $p1 })
  $U.opt2.Add_Click({ Show-Page $p2 })
  $U.back1.Add_Click({ Show-Page $pgHome }); $U.back2.Add_Click({ Show-Page $pgHome })
  $U.show.Add_Click({ $script:Box = $U.log1; $U.log1.Clear(); Show-Code ('' + $U.combo.Text); $script:Box = $null })
  $U.scan1.Add_Click({ Show-Page $p2; $U.run.PerformClick() })
  $U.run.Add_Click({
    $U.run.Enabled = $false; $U.back2.Enabled = $false; $U.result.Text = T 'busy'; $U.result.ForeColor = $hi
    $script:Box = $U.log2; $U.log2.Clear()
    try { $r = Run-Silent } catch { Log 'fail' ((T 'err_gui') -f $_.Exception.Message); $r = 'fail' }
    $script:Box = $null
    switch ($r) { 'ok' { $U.result.Text = T 'done_ok'; $U.result.ForeColor = [System.Drawing.Color]::LightGreen } 'warn' { $U.result.Text = T 'done_warn'; $U.result.ForeColor = [System.Drawing.Color]::Orange } default { $U.result.Text = T 'done_fail'; $U.result.ForeColor = [System.Drawing.Color]::Tomato } }
    $U.result.Height = 60
    if ($r -ne 'stop') { $U.launch.Enabled = $true; $U.safe.Enabled = $true }
    $U.run.Enabled = $true; $U.back2.Enabled = $true
  })
  $U.launch.Add_Click({ $script:Box = $U.log2; Start-CareDesk $false; $script:Box = $null })
  $U.safe.Add_Click({ $script:Box = $U.log2; Start-CareDesk $true; $script:Box = $null })
  $U.openbk.Add_Click({ try { New-Item -ItemType Directory -Force -Path $script:BackupRoot | Out-Null; Start-Process explorer.exe -ArgumentList ('"' + $script:BackupRoot + '"') } catch { } })
  $U.copy.Add_Click({ try { [System.Windows.Forms.Clipboard]::SetText(($script:Report -join "`r`n")); [System.Windows.Forms.MessageBox]::Show((T 'copied'), 'CareDesk Doctor') | Out-Null } catch { } })

  Apply-Lang; Show-Page $pgHome
  [System.Windows.Forms.Application]::Run($form)
} catch {
  try { Add-Content -LiteralPath $script:LogFile -Value ('GUI ERROR: ' + $_.Exception.ToString()) -Encoding UTF8 } catch { }
  try { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show(((T 'err_gui') -f $_.Exception.Message + "`r`n" + $script:LogFile), 'CareDesk Doctor') | Out-Null } catch { }
}
