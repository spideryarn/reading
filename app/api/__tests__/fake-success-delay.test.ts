/**
 * @jest-environment node
 */
import { POST } from '../fake_success_delay/route';
import { createMockRequest } from './test-helpers';

describe('/api/fake_success_delay', () => {
  it('should return success message after delay', async () => {
    const startTime = Date.now();
    
    const request = createMockRequest('http://localhost:3000/api/fake_success_delay', {
      method: 'POST'
    });
    
    const response = await POST(request);
    const result = await response.json();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(result).toEqual({
      msg: "Fake success API with 1.5s delay"
    });
    
    // Verify the delay was approximately 1.5 seconds (with some tolerance)
    expect(duration).toBeGreaterThan(1400); // Allow 100ms tolerance
    expect(duration).toBeLessThan(2000); // Max 2 seconds
  });
});