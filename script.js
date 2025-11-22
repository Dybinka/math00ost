// Система управления пользователями и оценками
class GradeManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('mathGradesUsers')) || [];
        this.grades = JSON.parse(localStorage.getItem('mathGrades')) || [];
        this.currentUser = null;
        this.userType = null;
        this.init();
    }

    init() {
        this.setMinDate();
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Авторизация
        document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormElement').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Переключение вкладок авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.form));
        });

        // Выбор типа пользователя при регистрации
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setUserType(e.target.dataset.type));
        });

        // Переключение видимости пароля
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePasswordVisibility(e.target));
        });

        // Управление оценками
        document.getElementById('gradeForm').addEventListener('submit', (e) => this.handleAddGrade(e));
        document.getElementById('searchInput').addEventListener('input', () => this.filterGrades());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Обработчик для удаления оценок
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-grade')) {
                this.deleteGrade(e.target.dataset.id);
            }
        });
    }

    // Авторизация и регистрация
    switchAuthTab(formType) {
        document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`.auth-tab[data-form="${formType}"]`).classList.add('active');
        document.getElementById(`${formType}Form`).classList.add('active');
    }

    setUserType(type) {
        this.userType = type;
        document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.user-type-btn[data-type="${type}"]`).classList.add('active');
    }

    togglePasswordVisibility(button) {
        const input = button.parentElement.querySelector('input');
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '👁️‍🗨️';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    handleLogin(e) {
        e.preventDefault();
        this.hideAllErrors();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!this.validateLogin(email, password)) {
            return;
        }

        const user = this.users.find(u => u.email === email && u.password === password);
        if (!user) {
            this.showError('loginPasswordError', 'Неверный email или пароль');
            return;
        }

        this.currentUser = user;
        this.showApp();
        this.showNotification(`Добро пожаловать, ${user.name}!`, 'success');
    }

    handleRegister(e) {
        e.preventDefault();
        this.hideAllErrors();

        const email = document.getElementById('registerEmail').value.trim();
        const name = document.getElementById('registerName').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (!this.validateRegister(email, name, password, passwordConfirm)) {
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            email,
            name,
            password,
            type: this.userType || 'student',
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        
        this.currentUser = newUser;
        this.showApp();
        this.showNotification('Регистрация успешна!', 'success');
    }

    validateLogin(email, password) {
        let isValid = true;

        if (!email) {
            this.showError('loginEmailError', 'Введите email');
            isValid = false;
        }

        if (!password) {
            this.showError('loginPasswordError', 'Введите пароль');
            isValid = false;
        }

        return isValid;
    }

    validateRegister(email, name, password, passwordConfirm) {
        let isValid = true;

        if (!this.userType) {
            this.showNotification('Выберите тип пользователя', 'error');
            isValid = false;
        }

        if (!email) {
            this.showError('registerEmailError', 'Введите email');
            isValid = false;
        } else if (this.users.find(u => u.email === email)) {
            this.showError('registerEmailError', 'Пользователь с таким email уже существует');
            isValid = false;
        }

        if (!name) {
            this.showError('registerNameError', 'Введите ФИО');
            isValid = false;
        }

        if (!password) {
            this.showError('registerPasswordError', 'Введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            this.showError('registerPasswordError', 'Пароль должен содержать минимум 6 символов');
            isValid = false;
        }

        if (!passwordConfirm) {
            this.showError('registerPasswordConfirmError', 'Подтвердите пароль');
            isValid = false;
        } else if (password !== passwordConfirm) {
            this.showError('registerPasswordConfirmError', 'Пароли не совпадают');
            isValid = false;
        }

        return isValid;
    }

    // Управление оценками
    handleAddGrade(e) {
        e.preventDefault();
        
        if (this.currentUser.type !== 'teacher') {
            this.showNotification('Только учителя могут добавлять оценки', 'error');
            return;
        }

        const studentName = document.getElementById('studentName').value.trim();
        const grade = document.getElementById('grade').value;
        const topic = document.getElementById('topic').value.trim();
        const date = document.getElementById('date').value;

        if (!this.validateGradeForm(studentName, grade, topic, date)) {
            return;
        }

        const newGrade = {
            id: Date.now().toString(),
            studentName,
            grade: parseInt(grade),
            topic,
            date,
            teacher: this.currentUser.name,
            createdAt: new Date().toISOString()
        };

        this.addGrade(newGrade);
        this.resetGradeForm();
        this.showNotification('Оценка успешно добавлена!', 'success');
    }

    validateGradeForm(studentName, grade, topic, date) {
        if (!studentName) {
            this.showNotification('Введите ФИО ученика', 'error');
            return false;
        }

        if (!grade) {
            this.showNotification('Выберите оценку', 'error');
            return false;
        }

        if (!topic) {
            this.showNotification('Введите тему работы', 'error');
            return false;
        }

        if (!date) {
            this.showNotification('Выберите дату', 'error');
            return false;
        }

        return true;
    }

    addGrade(grade) {
        this.grades.unshift(grade);
        this.saveGrades();
        this.loadGrades();
    }

    deleteGrade(id) {
        if (this.currentUser.type !== 'teacher') {
            this.showNotification('Только учителя могут удалять оценки', 'error');
            return;
        }

        if (confirm('Вы уверены, что хотите удалить эту оценку?')) {
            this.grades = this.grades.filter(grade => grade.id !== id);
            this.saveGrades();
            this.loadGrades();
            this.showNotification('Оценка удалена', 'success');
        }
    }

    filterGrades() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        let filteredGrades = this.grades;

        // Если пользователь - ученик, показываем только его оценки
        if (this.currentUser.type === 'student') {
            filteredGrades = filteredGrades.filter(grade => 
                grade.studentName.toLowerCase().includes(this.currentUser.name.toLowerCase())
            );
        }

        // Применяем поиск
        if (searchTerm) {
            filteredGrades = filteredGrades.filter(grade => 
                grade.studentName.toLowerCase().includes(searchTerm) ||
                grade.topic.toLowerCase().includes(searchTerm)
            );
        }

        this.renderGrades(filteredGrades);
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        this.loadGrades();
    }

    loadGrades() {
        let gradesToShow = this.grades;

        // Для учеников показываем только их оценки
        if (this.currentUser.type === 'student') {
            gradesToShow = gradesToShow.filter(grade => 
                grade.studentName.toLowerCase().includes(this.currentUser.name.toLowerCase())
            );
            document.getElementById('gradesListTitle').textContent = 'Мои оценки';
        } else {
            document.getElementById('gradesListTitle').textContent = 'Журнал оценок';
        }

        this.renderGrades(gradesToShow);
        this.updateStats();
    }

    renderGrades(grades) {
        const container = document.getElementById('gradesContainer');
        
        if (grades.length === 0) {
            container.innerHTML = '<div class="no-grades">Оценки не найдены</div>';
            return;
        }

        container.innerHTML = grades.map(grade => `
            <div class="grade-item">
                <div class="grade-info">
                    <div class="student-name">${this.escapeHtml(grade.studentName)}</div>
                    <div class="grade-details">
                        ${this.escapeHtml(grade.topic)} • ${this.formatDate(grade.date)}
                        ${grade.teacher ? ` • Преподаватель: ${this.escapeHtml(grade.teacher)}` : ''}
                    </div>
                </div>
                <div class="grade-actions">
                    <span class="grade-value grade-${grade.grade}">${grade.grade}</span>
                    ${this.currentUser.type === 'teacher' ? 
                        `<button class="btn-danger delete-grade" data-id="${grade.id}">Удалить</button>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        let gradesToCalculate = this.grades;

        // Для учеников считаем статистику только по их оценкам
        if (this.currentUser.type === 'student') {
            gradesToCalculate = gradesToCalculate.filter(grade => 
                grade.studentName.toLowerCase().includes(this.currentUser.name.toLowerCase())
            );
        }

        if (gradesToCalculate.length === 0) {
            this.resetStats();
            return;
        }

        const total = gradesToCalculate.length;
        const sum = gradesToCalculate.reduce((acc, grade) => acc + grade.grade, 0);
        const average = (sum / total).toFixed(2);
        const excellent = gradesToCalculate.filter(grade => grade.grade === 5).length;

        if (this.currentUser.type === 'student') {
            document.getElementById('studentAverageGrade').textContent = average;
            document.getElementById('studentTotalGrades').textContent = total;
            document.getElementById('studentExcellentGrades').textContent = excellent;
        } else {
            document.getElementById('averageGrade').textContent = average;
            document.getElementById('totalGrades').textContent = total;
            document.getElementById('excellentGrades').textContent = excellent;
        }
    }

    resetStats() {
        if (this.currentUser.type === 'student') {
            document.getElementById('studentAverageGrade').textContent = '0.00';
            document.getElementById('studentTotalGrades').textContent = '0';
            document.getElementById('studentExcellentGrades').textContent = '0';
        } else {
            document.getElementById('averageGrade').textContent = '0.00';
            document.getElementById('totalGrades').textContent = '0';
            document.getElementById('excellentGrades').textContent = '0';
        }
    }

    // Вспомогательные методы
    setMinDate() {
        const dateInput = document.getElementById('date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.min = '2024-01-01';
    }

    resetGradeForm() {
        document.getElementById('gradeForm').reset();
        this.setMinDate();
    }

    checkAuth() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
        }
    }

    showApp() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        // Сохраняем пользователя
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Показываем соответствующий интерфейс
        if (this.currentUser.type === 'teacher') {
            document.getElementById('teacherInterface').style.display = 'block';
            document.getElementById('studentInterface').style.display = 'none';
        } else {
            document.getElementById('teacherInterface').style.display = 'none';
            document.getElementById('studentInterface').style.display = 'block';
        }
        
        // Обновляем информацию о пользователе
        document.getElementById('userInfo').innerHTML = `
            ${this.escapeHtml(this.currentUser.name)}
            <span class="user-role">${this.currentUser.type === 'teacher' ? 'Учитель' : 'Ученик'}</span>
        `;
        
        this.loadGrades();
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('authContainer').style.display = 'flex';
        this.switchAuthTab('login');
        this.resetForms();
    }

    resetForms() {
        document.getElementById('loginFormElement').reset();
        document.getElementById('registerFormElement').reset();
        this.hideAllErrors();
    }

    hideAllErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.style.display = 'none';
        });
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
    }

    saveUsers() {
        localStorage.setItem('mathGradesUsers', JSON.stringify(this.users));
    }

    saveGrades() {
        localStorage.setItem('mathGrades', JSON.stringify(this.grades));
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new GradeManager();
});

// Добавляем стили для пустого состояния
const style = document.createElement('style');
style.textContent = `
    .no-grades {
        text-align: center;
        padding: 40px;
        color: #666;
        font-style: italic;
        background: #f8f9fa;
        border-radius: 8px;
        border: 2px dashed #dee2e6;
    }
`;
document.head.appendChild(style);

