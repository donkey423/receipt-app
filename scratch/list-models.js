const apiKey = "AIzaSyAdR5-bIHRMHYSr_wLySSWIbJKjYml6w6o";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  console.log("正在獲取可用模型清單...");
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log("可用模型如下:");
      data.models.forEach(m => {
        if (m.name.includes("flash")) {
          console.log(`- ${m.name}`);
        }
      });
    } else {
      console.error("無法獲取清單:", data.error?.message);
    }
  } catch (e) {
    console.error("異常:", e.message);
  }
}

listModels();
