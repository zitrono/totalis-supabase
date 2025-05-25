import { TestCheckInService } from '../services/checkin.service';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }))
}));

describe('TestCheckInService', () => {
  let checkInService: TestCheckInService;
  let mockSupabase: any;
  let mockFrom: any;

  beforeEach(() => {
    mockSupabase = createClient('', '');
    checkInService = new TestCheckInService(mockSupabase);
    
    // Setup mock chain
    mockFrom = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    mockSupabase.from.mockReturnValue(mockFrom);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startCheckIn', () => {
    it('should start a general check-in', async () => {
      const mockCheckIn = {
        id: 'check-in-1',
        user_id: 'test-user-id',
        category_id: null,
        status: 'in_progress',
        questions: [
          {
            id: '1',
            question: 'How would you rate your overall health today?',
            type: 'radio',
            options: ['Excellent', 'Good', 'Fair', 'Poor']
          }
        ],
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFrom.single.mockResolvedValue({ data: mockCheckIn, error: null });

      const result = await checkInService.startCheckIn();

      expect(mockSupabase.from).toHaveBeenCalledWith('check_ins');
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          status: 'in_progress',
          questions: expect.any(Array)
        })
      );
      expect(result.questions).toHaveLength(3); // Base questions
    });

    it('should start a category-specific check-in', async () => {
      const categoryId = 'category-123';
      const mockCheckIn = {
        id: 'check-in-2',
        user_id: 'test-user-id',
        category_id: categoryId,
        status: 'in_progress',
        questions: expect.any(Array),
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFrom.single.mockResolvedValue({ data: mockCheckIn, error: null });

      const result = await checkInService.startCheckIn(categoryId);

      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: categoryId
        })
      );
      expect(result.questions).toHaveLength(4); // Base + category-specific
    });
  });

  describe('answerQuestion', () => {
    const mockCheckIn = {
      id: 'check-in-1',
      status: 'in_progress',
      questions: [
        {
          id: '1',
          question: 'Test question?',
          type: 'radio',
          options: ['A', 'B', 'C']
        }
      ]
    };

    it('should update question with answer', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: mockCheckIn, error: null }) // fetch
        .mockResolvedValueOnce({ 
          data: { ...mockCheckIn, questions: [{ ...mockCheckIn.questions[0], answer: 'A' }] }, 
          error: null 
        }); // update

      const result = await checkInService.answerQuestion('check-in-1', 0, 'A');

      expect(mockFrom.update).toHaveBeenCalledWith({
        questions: expect.arrayContaining([
          expect.objectContaining({ answer: 'A' })
        ])
      });
      expect(result.questions[0].answer).toBe('A');
    });

    it('should include explanation when provided', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: mockCheckIn, error: null })
        .mockResolvedValueOnce({ 
          data: { 
            ...mockCheckIn, 
            questions: [{ ...mockCheckIn.questions[0], answer: 'A', explanation: 'Because...' }] 
          }, 
          error: null 
        });

      const result = await checkInService.answerQuestion('check-in-1', 0, 'A', 'Because...');

      expect(result.questions[0].explanation).toBe('Because...');
    });

    it('should throw error for invalid question index', async () => {
      mockFrom.single.mockResolvedValue({ data: mockCheckIn, error: null });

      await expect(
        checkInService.answerQuestion('check-in-1', 10, 'A')
      ).rejects.toThrow('Invalid question index');
    });
  });

  describe('completeCheckIn', () => {
    it('should complete check-in and generate insights', async () => {
      const mockCheckIn = {
        id: 'check-in-1',
        user_id: 'test-user-id',
        category_id: 'category-123',
        status: 'in_progress',
        questions: [
          {
            id: '1',
            question: 'Test?',
            type: 'radio',
            options: ['A', 'B'],
            answer: 'A'
          }
        ]
      };

      const completedCheckIn = {
        ...mockCheckIn,
        status: 'completed',
        completed_at: '2024-01-01T01:00:00Z',
        summary: 'Test summary',
        insight: 'Test insight',
        brief: 'Test brief',
        level: 75
      };

      mockFrom.single
        .mockResolvedValueOnce({ data: mockCheckIn, error: null }) // fetch
        .mockResolvedValueOnce({ data: completedCheckIn, error: null }) // update
        .mockResolvedValueOnce({ error: null }); // insert cards

      const result = await checkInService.completeCheckIn('check-in-1');

      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(String),
          summary: expect.any(String),
          insight: expect.any(String),
          brief: expect.any(String),
          level: expect.any(Number)
        })
      );
      expect(result.status).toBe('completed');
      expect(result.level).toBe(75);
    });

    it('should throw error if questions are not answered', async () => {
      const mockCheckIn = {
        id: 'check-in-1',
        status: 'in_progress',
        questions: [
          {
            id: '1',
            question: 'Test?',
            type: 'radio',
            options: ['A', 'B']
            // No answer
          }
        ]
      };

      mockFrom.single.mockResolvedValue({ data: mockCheckIn, error: null });

      await expect(
        checkInService.completeCheckIn('check-in-1')
      ).rejects.toThrow('1 questions are not answered');
    });
  });

  describe('abortCheckIn', () => {
    it('should abort check-in', async () => {
      mockFrom.eq.mockResolvedValue({ error: null });

      await expect(checkInService.abortCheckIn('check-in-1')).resolves.not.toThrow();

      expect(mockFrom.update).toHaveBeenCalledWith({ status: 'aborted' });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'check-in-1');
    });
  });
});