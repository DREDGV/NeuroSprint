# Публикация NeuroSprint на GitHub (после alpha v0.1.0)

Текущее состояние уже зафиксировано:
- commit: `6c84499`
- tag: `alpha-v0.1.0`

## Вариант A: через GitHub CLI (рекомендуется)
1. Авторизация:
```powershell
gh auth login
```
2. Создать repo и запушить:
```powershell
gh repo create NeuroSprint --public --source . --remote origin --push
git push origin alpha-v0.1.0
```

## Вариант B: через сайт GitHub (если repo уже создан)
1. Создайте пустой репозиторий на github.com, например:
`https://github.com/<USER>/NeuroSprint`
2. Выполните:
```powershell
git remote add origin https://github.com/<USER>/NeuroSprint.git
git branch -M main
git push -u origin main
git push origin alpha-v0.1.0
```

## После публикации
- Создайте GitHub Release из тега `alpha-v0.1.0`.
- В описание релиза добавьте текст из:
`docs/ALPHA_v0.1.0_RELEASE_NOTES_RU.md`.

