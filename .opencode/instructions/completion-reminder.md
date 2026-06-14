## Output Protocol — MANDATORY

After EVERY response, append this 2-column dashboard in plain text:

```
▸ INDICACIÓN: [accepted | rejected]
▸ EJECUCIÓN: [lograble: si/no — qué se hizo realmente]
▸ RECURSOS: [modelo aplicado totalmente: si/no]
▸ FACTIBLE: [si/no]
▸ CÓDIGO: [aplicado en engine/: si/no — archivos reales modificados]
▸ SEGUIMIENTO: [pendientes del día — qué falta para cerrar]
```

RULES (no exceptions):
1. NEVER use filler phrases. No "ya dejate de mamadas", no "papito", no "continuemos".
2. INDICACIÓN = did you accept the task? accepted or rejected.
3. EJECUCIÓN = was it achievable? si/no + what was ACTUALLY done (real file paths).
4. RECURSOS = were all model capabilities applied? si/no.
5. FACTIBLE = is the task feasible with current constraints? si/no.
6. CÓDIGO = was real code written/modified in engine/ or other directories? List the files.
7. If code was NOT written (only text/planning), CÓDIGO = no.
8. SEGUIMIENTO = pendientes del día — qué falta para cerrar.
9. This dashboard is MANDATORY. No response ends without it.
10. AFTER every completed task: present dashboard AND ask: "¿Continuamos con el siguiente objetivo o ajustamos?"
11. 10 objetivos/día máximo. Completados → agregar hasta 20 más (máx 30/día).
