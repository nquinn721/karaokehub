import { Body, Controller, Logger, Post, HttpStatus, HttpCode } from '@nestjs/common';

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'status-code': number;
    'script-sample': string;
  };
}

@Controller('api')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  @Post('csp-violation-report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reportCSPViolation(@Body() report: CSPViolationReport) {
    // Log CSP violations for monitoring and debugging
    this.logger.warn('CSP Violation Report:', {
      documentUri: report['csp-report']['document-uri'],
      violatedDirective: report['csp-report']['violated-directive'],
      blockedUri: report['csp-report']['blocked-uri'],
      effectiveDirective: report['csp-report']['effective-directive'],
      sourceFile: report['csp-report']['source-file'],
      lineNumber: report['csp-report']['line-number'],
    });

    // Return 204 No Content as per CSP spec
    return;
  }
}
