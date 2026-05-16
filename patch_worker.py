import re

with open("src/worker.ts", "r") as f:
    content = f.read()

content = content.replace("const { id, action, task, model, input, config } = event.data;", "const { id, action, task, model, input } = event.data;")

with open("src/worker.ts", "w") as f:
    f.write(content)
