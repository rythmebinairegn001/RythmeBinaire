# Activation : révision espacée des quiz

1. `git push` du code (carte « À réviser » sur le tableau de bord élève).
2. Dans Supabase > SQL Editor, lancer `supabase/quiz-tentatives.sql` (script 17) si ce n'est pas déjà fait, puis `supabase/revision.sql` (script 18).
3. Tester : faire un quiz en ratant une question, puis ouvrir le tableau de bord. La carte « À réviser » apparaît ; la question revient le lendemain, puis à J+3, J+7, J+14, J+30.

Sans le script 18, la carte reste simplement cachée en cas d'erreur, rien ne casse.
