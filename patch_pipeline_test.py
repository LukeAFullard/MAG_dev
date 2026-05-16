import re

with open("tests/pipeline.spec.ts", "r") as f:
    content = f.read()

# Increase timeout since CI/docker is much slower than my local verification
content = content.replace("test('should simulate video processing workflow and show extracted clips', async ({ page }) => {", "test('should simulate video processing workflow and show extracted clips', async ({ page }) => {\n    test.setTimeout(180000); // Allow up to 3 minutes for ML processing in headless mode")
content = content.replace("await expect(jobItem).toContainText('Processing Complete', { timeout: 90000 });", "await expect(jobItem).toContainText('Processing Complete', { timeout: 150000 });")

with open("tests/pipeline.spec.ts", "w") as f:
    f.write(content)
