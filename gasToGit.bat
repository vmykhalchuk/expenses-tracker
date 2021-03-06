@echo off
setlocal

call git pull
cd gas
call clasp pull
cd ..

git add .
git diff --cached

set /p gitmessage="Enter commit message: "
rem trim gitmessage from the left (no good to code to trim right)
for /f "tokens=* delims= " %%a in ("%gitmessage%") do set gitmessage=%%a
if "!%gitmessage%~" == "!~" goto END

git commit -m "%gitmessage%" -m "Gas to Git commit %date% %time%"
call git push

:END
endlocal
pause