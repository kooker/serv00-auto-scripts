const fs = require('fs');
const puppeteer = require('puppeteer');

function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

async function delayTime(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  // 读取 webhostmost.json 中的 JSON 字符串
  const accountsJson = fs.readFileSync('webhostmost.json', 'utf-8');
  const accounts = JSON.parse(accountsJson);

  for (const account of accounts) {
    const { username, password } = account; // 去掉 panelnum

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const url = 'https://webhostmost.com/login'; // 修改为新的登录页面

    try {
      // 访问新的登录页面
      await page.goto(url);

      // 清空用户名输入框的原有值
      const usernameInput = await page.$('#inputEmail');
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 }); // 选中输入框的内容
        await usernameInput.press('Backspace'); // 删除原来的值
      }

      // 输入实际的账号和密码
      await page.type('#inputEmail', username); // 确保 #id_username 对应新页面的用户名输入框
      await page.type('#inputPassword', password); // 确保 #id_password 对应新页面的密码输入框

      // 提交登录表单
      const loginButton = await page.$('#login'); // 确保 #submit 对应新页面的登录按钮
      if (loginButton) {
        await loginButton.click();
      } else {
        throw new Error('无法找到登录按钮');
      }

      // 等待登录成功（如果有跳转页面的话）
      await page.waitForNavigation();

      // 判断是否登录成功
      const isLoggedIn = await page.evaluate(() => {
        const logoutButton = document.querySelector('a[href="/logout/"]');
        return logoutButton !== null;
      });

      if (isLoggedIn) {
        // 获取当前的UTC时间和北京时间
        const nowUtc = formatToISO(new Date());// UTC时间
        const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)); // 北京时间东8区，用算术来搞
        console.log(`账号 ${username} 于北京时间 ${nowBeijing}（UTC时间 ${nowUtc}）登录成功！`);
      } else {
        console.error(`账号 ${username} 登录失败，请检查账号和密码是否正确。`);
      }
    } catch (error) {
      console.error(`账号 ${username} 登录时出现错误: ${error}`);
    } finally {
      // 关闭页面和浏览器
      await page.close();
      await browser.close();

      // 用户之间添加随机延时
      const delay = Math.floor(Math.random() * 8000) + 1000; // 随机延时1秒到8秒之间
      await delayTime(delay);
    }
  }

  console.log('所有账号登录完成！');
})();
