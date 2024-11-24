function downloadMarkdown() {
  const markdownContent = document.getElementById("output").value;
  const blob = new Blob([markdownContent], {
    type: "text/markdown;charset=utf-8",
  });

  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "converted.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    // Для старых браузеров или в случае ошибки
    console.error("Ошибка при скачивании:", e);
    alert(
      "Произошла ошибка при скачивании файла. Пожалуйста, скопируйте текст вручную."
    );
  }
}

document
  .getElementById("downloadBtn")
  .addEventListener("click", downloadMarkdown);
