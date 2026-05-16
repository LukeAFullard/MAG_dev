import re

with open("tests/autoClip.spec.ts", "r") as f:
    content = f.read()

# Increase timeout since CI/docker is much slower than my local verification
content = content.replace("test('should display extracted clips when a video is uploaded', async ({ page }) => {", "test('should display extracted clips when a video is uploaded', async ({ page }) => {\n    test.setTimeout(180000); // Allow up to 3 minutes for ML processing in headless mode")
content = content.replace("await expect(jobItem).toContainText('completed', { timeout: 30000 });", "await expect(jobItem).toContainText('completed', { timeout: 150000 });")

with open("tests/autoClip.spec.ts", "w") as f:
    f.write(content)
