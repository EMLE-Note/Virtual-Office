@echo off
cd /d C:\Users\user\Documents\GitHub\map_v0.1

echo === Adding changes ===
git add .

echo === Committing changes ===
git commit -m "تحديث تلقائي"

echo === Pushing to origin (المشروع الرئيسي) ===
git push origin main

echo === Pushing to other (Virtual-Office) ===
git push other main

echo === Done! ===
pause
