import { requireOptionalNativeModule } from 'expo-modules-core';
import type { OcrResult } from '../../src/domain';
export interface PayslipOcrModule {
  recognize(uri: string): Promise<OcrResult>;
  prepareStorage(): Promise<string>;
}
export default requireOptionalNativeModule<PayslipOcrModule>('PayslipOcr');
