import { defineSkill } from '../../src/utils/skill';

export default defineSkill({
  name: 'pivot-table-s2',
  description: 'Create interactive pivot tables using AntV S2 library',
  parameters: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: 'The data array for the pivot table',
        items: {
          type: 'object'
        }
      },
      rows: {
        type: 'array',
        description: 'Row field names for the pivot table',
        items: {
          type: 'string'
        }
      },
      columns: {
        type: 'array',
        description: 'Column field names for the pivot table',
        items: {
          type: 'string'
        }
      },
      values: {
        type: 'array',
        description: 'Value field names and aggregation methods',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            aggregation: {
              type: 'string',
              enum: ['sum', 'count', 'avg', 'max', 'min']
            }
          },
          required: ['field']
        }
      },
      options: {
        type: 'object',
        description: 'Additional S2 options',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
          showGrandTotals: { type: 'boolean' },
          showSubTotals: { type: 'boolean' }
        }
      }
    },
    required: ['data', 'rows', 'columns', 'values']
  },

  handler: async ({ data, rows, columns, values, options = {} }) => {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>交叉透视表 - AntV S2</title>
    <script src="https://unpkg.com/@antv/s2@latest/dist/index.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            padding: 20px;
            background: #001529;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .controls {
            padding: 16px 20px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .control-group label {
            font-size: 14px;
            color: #666;
        }
        .control-group button {
            padding: 6px 12px;
            border: 1px solid #d9d9d9;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        .control-group button:hover {
            border-color: #1890ff;
            color: #1890ff;
        }
        .control-group button.active {
            background: #1890ff;
            color: white;
            border-color: #1890ff;
        }
        #container {
            padding: 20px;
            min-height: 500px;
        }
        .info-panel {
            padding: 16px 20px;
            background: #fafafa;
            border-top: 1px solid #f0f0f0;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>交叉透视表 - AntV S2</h1>
        </div>
        <div class="controls">
            <div class="control-group">
                <label>布局模式：</label>
                <button id="pivot-mode" class="active">透视表</button>
                <button id="table-mode">明细表</button>
            </div>
            <div class="control-group">
                <label>显示总计：</label>
                <button id="toggle-totals" class="active">开启</button>
            </div>
            <div class="control-group">
                <button id="export-btn">导出数据</button>
            </div>
        </div>
        <div id="container"></div>
        <div class="info-panel">
            <div>行维度：${rows.join('、')}</div>
            <div>列维度：${columns.join('、')}</div>
            <div>指标：${values.map(v => v.field + '(' + (v.aggregation || 'sum') + ')').join('、')}</div>
        </div>
    </div>

    <script>
        // 数据准备
        const rawData = ${JSON.stringify(data)};

        // 配置行、列维度和指标
        const rowFields = ${JSON.stringify(rows)};
        const colFields = ${JSON.stringify(columns)};
        const valueFields = ${JSON.stringify(values)};

        // 默认配置
        const defaultOptions = {
            width: ${options.width || 1160},
            height: ${options.height || 600},
            showGrandTotals: ${options.showGrandTotals !== false},
            showSubTotals: ${options.showSubTotals !== false},
            style: {
                layoutWidthType: 'compact',
                colCell: {
                    text: {
                        fontSize: 12,
                        fontWeight: 'bold'
                    }
                },
                rowCell: {
                    text: {
                        fontSize: 12
                    }
                },
                dataCell: {
                    text: {
                        fontSize: 12
                    }
                }
            }
        };

        let s2Instance;
        let currentMode = 'pivot';

        // 数据转换函数
        function transformDataForPivot(data, rows, columns, values) {
            // 简化的数据转换逻辑
            // 实际项目中可能需要更复杂的聚合逻辑
            return data.map(item => {
                const transformed = {};

                // 添加行维度
                rows.forEach(row => {
                    transformed[row] = item[row];
                });

                // 添加列维度
                columns.forEach(col => {
                    transformed[col] = item[col];
                });

                // 添加指标
                values.forEach(val => {
                    const field = val.field;
                    const agg = val.aggregation || 'sum';
                    transformed[field] = item[field];
                    transformed[field + '_agg'] = agg;
                });

                return transformed;
            });
        }

        // 准备数据配置
        const dataCfg = {
            fields: {
                rows: rowFields,
                columns: colFields,
                values: valueFields.map(v => v.field),
                valueInCols: true
            },
            data: transformDataForPivot(rawData, rowFields, colFields, valueFields),
            meta: [
                ...rowFields.map(field => ({
                    field,
                    name: field
                })),
                ...colFields.map(field => ({
                    field,
                    name: field
                })),
                ...valueFields.map(val => ({
                    field: val.field,
                    name: val.field + ' (' + (val.aggregation || 'sum') + ')'
                }))
            ]
        };

        // 创建透视表
        function createPivotTable() {
            const container = document.getElementById('container');
            container.innerHTML = '';

            s2Instance = new s2.PivotSheet(container, dataCfg, defaultOptions);
            s2Instance.render();
        }

        // 创建明细表
        function createTableSheet() {
            const container = document.getElementById('container');
            container.innerHTML = '';

            // 明细表配置
            const tableDataCfg = {
                fields: {
                    columns: [...rowFields, ...colFields, ...valueFields.map(v => v.field)]
                },
                data: rawData,
                meta: [
                    ...rowFields.map(field => ({
                        field,
                        name: field
                    })),
                    ...colFields.map(field => ({
                        field,
                        name: field
                    })),
                    ...valueFields.map(val => ({
                        field: val.field,
                        name: val.field
                    }))
                ]
            };

            s2Instance = new s2.TableSheet(container, tableDataCfg, defaultOptions);
            s2Instance.render();
        }

        // 初始化
        createPivotTable();

        // 事件监听
        document.getElementById('pivot-mode').addEventListener('click', function() {
            if (currentMode !== 'pivot') {
                currentMode = 'pivot';
                document.getElementById('pivot-mode').classList.add('active');
                document.getElementById('table-mode').classList.remove('active');
                createPivotTable();
            }
        });

        document.getElementById('table-mode').addEventListener('click', function() {
            if (currentMode !== 'table') {
                currentMode = 'table';
                document.getElementById('table-mode').classList.add('active');
                document.getElementById('pivot-mode').classList.remove('active');
                createTableSheet();
            }
        });

        document.getElementById('toggle-totals').addEventListener('click', function() {
            const btn = this;
            const show = btn.classList.contains('active');

            if (show) {
                btn.classList.remove('active');
                btn.textContent = '关闭';
                defaultOptions.showGrandTotals = false;
                defaultOptions.showSubTotals = false;
            } else {
                btn.classList.add('active');
                btn.textContent = '开启';
                defaultOptions.showGrandTotals = true;
                defaultOptions.showSubTotals = true;
            }

            if (currentMode === 'pivot') {
                createPivotTable();
            }
        });

        document.getElementById('export-btn').addEventListener('click', function() {
            if (s2Instance) {
                // 简化的导出功能
                const data = s2Instance.getData();
                alert('导出功能需要后端支持，当前数据量：' + data.length + ' 行');
            }
        });
    </script>
</body>
</html>
    `;

    return {
      success: true,
      message: '透视表已创建',
      artifacts: [{
        type: 'html',
        content: htmlTemplate,
        title: '交叉透视表 - AntV S2'
      }]
    };
  }
});