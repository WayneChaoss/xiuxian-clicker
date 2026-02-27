// 调试脚本 - 检查点击问题
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 调试信息 ===');
    
    const clickArea = document.getElementById('clickArea');
    console.log('点击区域元素:', clickArea);
    console.log('点击区域z-index:', window.getComputedStyle(clickArea).zIndex);
    
    // 测试直接点击
    clickArea.addEventListener('click', function(e) {
        console.log('点击区域被点击了!', e);
    });
    
    // 检查怪物区域是否遮挡
    const monster = document.querySelector('.monster-section');
    if (monster) {
        const rect = monster.getBoundingClientRect();
        console.log('怪物区域位置:', rect);
    }
});
