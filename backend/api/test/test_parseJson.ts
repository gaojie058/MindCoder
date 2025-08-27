import * as fs from 'fs';
import * as path from 'path';

// 定义类型
interface Card {
  id: string;
  name: string;
  chunks: string[];
}

interface Code {
  id: string;
  name: string;
  data: Record<string, Card[]>;
}

// result_gpt.json文件的数据结构
interface ClusterInfo {
  name: string;
  chunks: string[];
}

interface CodeInfo {
  name: string;
  clusters: Record<string, ClusterInfo>;
}

interface ResultGptData {
  [key: string]: CodeInfo;
}

// 新的数据结构定义
interface ClusterData {
  name: string;
  chunks: string[];
}

interface CodeData {
  name: string;
  clusters: Record<string, ClusterData>;
}

interface ParsedResultData {
  [key: string]: CodeData;
}

// 解析result_gpt.json文件中的新格式数据（优化版本，支持大文件处理）
export const parseResultGptJson = (): void => {
  try {
    const resultFilePath = path.join(__dirname, 'result_gpt.json');
    
    // 读取文件
    const fileContent = fs.readFileSync(resultFilePath, 'utf8');
    
    // result_gpt.json文件包含一个JSON字符串，需要先解析这个字符串
    const jsonString = JSON.parse(fileContent);
    console.log('\n原始JSON字符串:');
    console.log(jsonString);
    
    // 然后解析这个JSON字符串得到实际的数据结构
     const parsedData = JSON.parse(jsonString);
     console.log('\n✅ 成功解析JSON数据结构');
     console.log(`📊 发现 ${Object.keys(parsedData).length} 个Code对象`);
    
    // 遍历每个Code
    Object.entries(parsedData).forEach(([codeKey, codeData]: [string, any]) => {
      console.log(`\n处理 ${codeKey}:`);
      console.log(`名称: ${codeData.name}`);
      
      // 遍历每个Cluster
      if (codeData.clusters) {
        console.log('\n聚类信息:');
        Object.entries(codeData.clusters).forEach(([clusterKey, clusterData]: [string, any]) => {
          console.log(`\n${clusterKey}:`);
          console.log(`  名称: ${clusterData.name}`);
          console.log(`  数据块数量: ${clusterData.chunks.length}`);
          
          // 显示前3个数据块作为示例
          console.log('  前3个数据块:');
          clusterData.chunks.slice(0, 3).forEach((chunk: string, index: number) => {
            console.log(`    ${index + 1}. ${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}`);
          });
        });
      }
    });
    
    // 转换为cards格式以便后续使用
    const convertedCards: Record<string, Card> = {};
    Object.entries(parsedData).forEach(([codeKey, codeData]: [string, any]) => {
      if (codeData.clusters) {
        Object.entries(codeData.clusters).forEach(([clusterKey, clusterData]: [string, any]) => {
          const clusterId = clusterKey.replace('Cluster ', '');
          convertedCards[clusterId] = {
            id: clusterId,
            name: clusterData.name,
            chunks: clusterData.chunks
          };
        });
      }
    });
    
    console.log('\n转换后的Cards格式数据:');
    console.log(JSON.stringify(convertedCards, null, 2));
    
  } catch (error) {
    console.error('读取或解析result_gpt.json文件失败:', error);
    if (error instanceof SyntaxError) {
      console.error('JSON解析错误，请检查文件格式是否正确');
    }
  }
};

// 测试函数
const testParseResultGpt = () => {
  console.log('开始解析result_gpt.json文件...');
  parseResultGptJson();
  console.log('\n解析完成!');
};

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  testParseResultGpt();
}
