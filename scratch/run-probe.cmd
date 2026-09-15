@echo off
cd /d "%~dp0.."
node scratch\p7b-probe.cjs > scratch\p7b-probe.json 2>&1
