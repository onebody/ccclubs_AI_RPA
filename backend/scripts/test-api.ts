import axios from 'axios';

async function testApi() {
  console.log('=== 测试后端 API：创建浏览器会话并访问 122.gov.cn ===\n');

  const apiUrl = 'http://localhost:3000/api';

  try {
    // 1. 创建会话
    console.log('1. 创建浏览器会话...');
    const createRes = await axios.post(`${apiUrl}/session/create`, {
      maxLifetime: 10,
      memoryLimit: '2Gi',
      cpuLimit: '1',
    });
    const { sessionId, cdpPort, proxyUrl } = createRes.data;
    console.log('   会话ID:', sessionId);
    console.log('   CDP端口:', cdpPort);
    console.log('   代理URL:', proxyUrl);

    // 等待浏览器启动
    console.log('\n2. 等待浏览器启动...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. 创建页面
    console.log('3. 创建页面并访问 122.gov.cn...');
    await axios.post(`${apiUrl}/browser/${sessionId}/page`, {
      url: 'https://zj.122.gov.cn/',
    });
    console.log('   页面访问请求发送完成');

    // 4. 获取页面信息
    console.log('\n4. 获取页面信息...');
    const infoRes = await axios.get(`${apiUrl}/browser/${sessionId}/info`);
    console.log('   页面标题:', infoRes.data.title);
    console.log('   页面URL:', infoRes.data.url);
    console.log('   内容长度:', infoRes.data.contentLength, '字节');

    // 5. 获取截图
    console.log('\n5. 获取页面截图...');
    const screenshotRes = await axios.get(`${apiUrl}/browser/${sessionId}/screenshot`, {
      responseType: 'arraybuffer',
    });
    console.log('   截图大小:', screenshotRes.data.length, '字节');

    console.log('\n✅ API 测试通过！');

  } catch (error) {
    console.error('\n❌ API 测试失败:', error.response?.data || error.message);
  }
}

testApi();
