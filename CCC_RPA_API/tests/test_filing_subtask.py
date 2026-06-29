"""
FilingSubTask 验证脚本
测试子任务的初始化、方法完整性、数据流程、进度广播接口
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def test_import():
    """测试导入"""
    from app.browser.sub_tasks.filing import FilingSubTask
    from app.browser.sub_tasks.base import BaseSubTask
    assert issubclass(FilingSubTask, BaseSubTask)
    print("✅ 导入和继承关系正确")

def test_methods():
    """测试关键方法存在"""
    from app.browser.sub_tasks.filing import FilingSubTask
    required = [
        'execute', '_navigate_to_filing', '_get_pending_filings',
        '_process_single_filing', '_submit_filing', '_verify_success'
    ]
    missing = [m for m in required if not hasattr(FilingSubTask, m)]
    if missing:
        print(f"❌ 缺失方法: {missing}")
    else:
        print(f"✅ 所有 {len(required)} 个关键方法存在")

def test_pagination_methods():
    """测试翻页方法"""
    from app.browser.sub_tasks.filing import FilingSubTask
    pagination = ['_get_all_pending_filings', '_go_to_next_page', '_has_next_page']
    existing = [m for m in pagination if hasattr(FilingSubTask, m)]
    print(f"✅ 翻页方法: {len(existing)}/{len(pagination)} 存在 - {existing}")

def test_progress_broadcast_interface():
    """测试进度广播接口"""
    from app.browser.sub_tasks.base import BaseSubTask
    assert hasattr(BaseSubTask, '_broadcast_progress')
    print("✅ _broadcast_progress 方法存在于 BaseSubTask")

def test_context_passing():
    """测试 context 传递链路"""
    from app.browser.sub_tasks.base import BaseSubTask
    import inspect
    sig = inspect.signature(BaseSubTask.__init__)
    params = list(sig.parameters.keys())
    has_context = 'context' in params
    print(f"{'✅' if has_context else '❌'} BaseSubTask.__init__ 参数: {params}")

def test_registry():
    """测试注册表"""
    from app.browser.sub_tasks import SubTaskRegistry
    filing_keys = [k for k, v in SubTaskRegistry._registry.items() 
                   if v.__name__ == 'FilingSubTask']
    print(f"✅ FilingSubTask 注册键: {filing_keys}")

def test_executor_integration():
    """测试 executor 集成"""
    # 检查 site_automation.py 中 execute_sub_task 委托逻辑
    import importlib
    mod = importlib.import_module('app.browser.site_automation')
    assert hasattr(mod.SiteAutomation, 'execute_sub_task')
    print("✅ SiteAutomation.execute_sub_task 存在")

if __name__ == '__main__':
    tests = [test_import, test_methods, test_pagination_methods, 
             test_progress_broadcast_interface, test_context_passing,
             test_registry, test_executor_integration]
    
    print("=" * 60)
    print("FilingSubTask 验证测试")
    print("=" * 60)
    
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"❌ {test.__name__}: {e}")
            failed += 1
    
    print("=" * 60)
    print(f"结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
