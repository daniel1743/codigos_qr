@echo off
cd /d "%~dp0.."
node -e "console.log('wrapper-ok ' + process.cwd())" > scratch\probe-run.out 2>&1
echo exit=%ERRORLEVEL% >> scratch\probe-run.out
