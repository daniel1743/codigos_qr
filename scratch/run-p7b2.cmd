@echo off
cd /d "%~dp0.."
echo start %DATE% %TIME% > scratch\qa-p7b-trace.log
node scratch\qa-p7b-generator.cjs >> scratch\qa-p7b-trace.log 2>&1
echo done %ERRORLEVEL% >> scratch\qa-p7b-trace.log
