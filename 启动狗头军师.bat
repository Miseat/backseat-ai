@echo off
chcp 65001 >nul
title 🐶 狗头军师（独立版）
cd /d "%~dp0"
echo 正在启动 🐶 狗头军师...
start "" http://localhost:3800
node server.js
pause
