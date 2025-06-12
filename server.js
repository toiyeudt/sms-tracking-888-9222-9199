// Template cho 2 cú pháp SMS - CẦN ĐIỀN THÔNG TIN

const SMS_CONFIG = {
    country: 'vn',
    shortcode: '9199',
    
    packages: {
        // ✅ Cú pháp 1 - ĐÃ CÓ
        'ETC3': {
            keywords: ['ETC3', 'DK ETC3', 'DANG KY ETC3'],
            unsubscribe_keywords: ['HUY ETC', 'HUY ETC3', 'CANCEL ETC'],
            price: '5000',
            description: 'Package ETC3 - 5000 VND'
        },
        
        // ❓ Cú pháp 2 - CẦN THÔNG TIN
        'PACKAGE_2_NAME': {  // ← Cần tên package thực tế
            keywords: [
                'SYNTAX_2',           // ← Cần cú pháp SMS thực tế
                'DK SYNTAX_2',        // ← Các biến thể
                'DANG KY SYNTAX_2'
            ],
            unsubscribe_keywords: [
                'HUY SYNTAX_2',       // ← Keywords hủy
                'CANCEL SYNTAX_2'
            ],
            price: '5000',            // ← Giá thực tế (5000 VND?)
            description: 'Package 2 description'  // ← Mô tả
        }
    },
    
    operators: ['viettel', 'vinaphone', 'mobifone', 'vietnamobile']
};

// Example với thông tin giả định:
const EXAMPLE_DUAL_CONFIG = {
    country: 'vn', 
    shortcode: '9199',
    
    packages: {
        // Cú pháp 1
        'ETC3': {
            keywords: ['ETC3', 'DK ETC3'],
            unsubscribe_keywords: ['HUY ETC'],
            price: '5000',
            description: 'Package ETC3 - 5000 VND'
        },
        
        // Cú pháp 2 (ví dụ)
        'BCL5': {
            keywords: ['BCL5', 'DK BCL5'],
            unsubscribe_keywords: ['HUY BCL5'],
            price: '3000',  // Có thể khác giá
            description: 'Package BCL5 - 3000 VND'
        }
    }
};

// Test cases sẽ như này:
const TEST_CASES = [
    // Test cú pháp 1
    {
        text: 'ETC3',
        expected_package: 'ETC3',
        expected_price: '5000'
    },
    
    // Test cú pháp 2  
    {
        text: 'BCL5',  // ← Cần cú pháp thật
        expected_package: 'BCL5',  // ← Cần package thật
        expected_price: '3000'  // ← Cần giá thật
    }
];
