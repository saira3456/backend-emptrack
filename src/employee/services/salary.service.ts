const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').trim();

export class SalaryService {
  static async getEmployeeSalaries(employeeId: string): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/employees/${employeeId}/salaries`;
      console.log('📤 Fetching salaries from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch salaries: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching salaries:', error);
      return [];
    }
  }
}