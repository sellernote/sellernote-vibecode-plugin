# Security Convention

> This document defines the security rules for backend applications.
> It covers all security-related rules including authentication/authorization, input validation, and data protection.
>
> Parent rule: BACKEND_CONVENTION.md
>
> Related documents:
> - NESTJS_CONVENTION.md
> - SPRING_CONVENTION.md
> - TYPEORM_CONVENTION.md
> - API_SPEC_CONVENTION.md

## Authentication/Authorization

### JWT Token Management

- **Rule**: [MUST] Use JWT (JSON Web Token) for authentication, and separate the Access Token and Refresh Token.

| Token | Lifetime | Storage Location | Purpose |
|------|------|----------|------|
| Access Token | 15 min ~ 1 hour | Memory or HTTP Header | API authentication |
| Refresh Token | 7 days ~ 30 days | HttpOnly Cookie or DB | Access Token renewal |

### JWT Signing Algorithm

- **Rule**: [MUST] Use at least HS256 (HMAC-SHA256) or higher for the JWT signing algorithm.
- **Rule**: [SHOULD] Use the RS256 (RSA-SHA256) asymmetric algorithm in production environments.
- **Good example**:
  ```typescript
  // NestJS - Using RS256 asymmetric algorithm
  @Module({
    imports: [
      JwtModule.register({
        privateKey: fs.readFileSync('keys/private.pem'),
        publicKey: fs.readFileSync('keys/public.pem'),
        signOptions: { algorithm: 'RS256', expiresIn: '15m' },
      }),
    ],
  })
  export class AuthModule {}
  ```
> [MUST NOT] Using `algorithm: 'none'` is prohibited.

### Token Payload

- **Rule**: [MUST NOT] Do not include sensitive information (passwords, resident registration numbers, card numbers, etc.) in the JWT token payload.
- **Rule**: [SHOULD] Include only the minimum information necessary for authentication/authorization in the token payload.
- **Good example**:
  ```typescript
  const payload = {
    sub: user.id,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };
  ```

### Refresh Token Rotation

- **Rule**: [SHOULD] Apply a Refresh Token Rotation strategy. When renewing an Access Token with a Refresh Token, issue a new Refresh Token as well and immediately invalidate the existing Refresh Token.
- **Good example**:
  ```typescript
  @Injectable()
  export class AuthService {
    async refreshTokens(currentRefreshToken: string): Promise<TokenPair> {
      const payload = await this.jwtService.verifyAsync(currentRefreshToken);
      const storedToken = await this.refreshTokenRepository.findOneBy({
        token: currentRefreshToken, userId: payload.sub, isRevoked: false,
      });

      if (!storedToken) {
        // Already used token - suspected theft, invalidate all Refresh Tokens
        await this.refreshTokenRepository.update({ userId: payload.sub }, { isRevoked: true });
        throw new UnauthorizedException('Abnormal token renewal has been detected.');
      }

      await this.refreshTokenRepository.update({ id: storedToken.id }, { isRevoked: true });
      const newAccessToken = this.jwtService.sign({ sub: payload.sub, role: payload.role });
      const newRefreshToken = this.jwtService.sign({ sub: payload.sub }, { expiresIn: '30d' });
      await this.refreshTokenRepository.save({ token: newRefreshToken, userId: payload.sub, isRevoked: false });
      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }
  }
  ```

### Authentication Header

- **Rule**: [MUST] Send the authentication token in the `Authorization` header using the Bearer scheme.
- **Good example**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  ```

### Role-Based Access Control (RBAC)

- **Rule**: [SHOULD] Use a role-based permission system.
- **Good example**:
  ```typescript
  // NestJS
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('/users/:id')
  async deleteUser(@Param('id') id: string) { ... }
  ```
  ```java
  // Spring
  @Configuration @EnableWebSecurity
  public class SecurityConfig {
      @Bean
      public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
          http.authorizeHttpRequests(auth -> auth
              .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
              .requestMatchers("/api/v1/orders/**").hasAnyRole("USER", "ADMIN")
              .requestMatchers("/api/v1/auth/**").permitAll()
              .anyRequest().authenticated()
          );
          return http.build();
      }
  }
  ```
> [MUST NOT] Do not perform role checks directly inside Controller methods. Use Guard/SecurityConfig instead.

### Password Handling

- **Rule**: [MUST] Store passwords using a one-way hash algorithm such as bcrypt. Storing in plaintext is strictly prohibited.
- **Rule**: [MUST NOT] Do not include password hashes in API responses.
- **Good example**:
  ```typescript
  import * as bcrypt from 'bcrypt';

  @Injectable()
  export class UserService {
    private readonly SALT_ROUNDS = 12;

    async createUser(dto: CreateUserDto): Promise<User> {
      const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
      return this.userRepository.save({ email: dto.email, password: hashedPassword });
    }

    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
      return bcrypt.compare(plainPassword, hashedPassword);
    }
  }
  ```

## Input Validation and Data Protection

### Input Validation Principles

- **Rule**: [MUST] All user input must be validated on the server side.
- **Rule**: [MUST] Input validation must be performed using a whitelist (allow list) approach.
- **Good example**:
  ```typescript
  // NestJS - Whitelist-based validation with ValidationPipe + DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  ```

### SQL Injection Prevention

- **Rule**: [MUST] Always use parameter binding when including user input in SQL queries.

> Refer to TYPEORM_CONVENTION.md for specific usage of parameter binding.

- **Good example**:
  ```typescript
  // TypeORM QueryBuilder
  const users = await this.userRepository
    .createQueryBuilder('user')
    .where('user.email = :email', { email: userInput })
    .getMany();
  ```
  ```java
  // Spring Data JPA
  @Query("SELECT u FROM User u WHERE u.email = :email AND u.status = :status")
  List<User> findByEmailAndStatus(@Param("email") String email, @Param("status") String status);
  ```
> [MUST NOT] Do not construct SQL queries using string interpolation/concatenation (e.g., `` `user.email = '${userInput}'` ``).

### XSS (Cross-Site Scripting) Prevention

- **Rule**: [MUST] Always perform escaping when outputting user input as HTML.
- **Rule**: [MUST NOT] Do not insert user input directly into HTML without validation.
- **Rule**: [SHOULD] Sanitize user HTML content using `sanitize-html` or similar to allow only permitted tags.
- **Good example**:
  ```typescript
  import * as sanitizeHtml from 'sanitize-html';

  @Injectable()
  export class ContentService {
    sanitizeUserContent(rawHtml: string): string {
      return sanitizeHtml(rawHtml, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
        allowedAttributes: { a: ['href', 'title'] },
        allowedSchemes: ['http', 'https'],
      });
    }
  }
  ```

### Mass Assignment Prevention

- **Rule**: [MUST] Only allow fields defined in the DTO, and reject or ignore undefined fields.

> Refer to NESTJS_CONVENTION.md for NestJS `ValidationPipe` configuration.

- **Good example**:
  ```typescript
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  export class UpdateUserDto {
    @IsString() @IsOptional() nickname?: string;
    @IsString() @IsOptional() bio?: string;
    // isAdmin, role, etc. are not defined -> rejected if included in the request
  }
  ```
  ```java
  @JsonIgnoreProperties(ignoreUnknown = true)
  public class UpdateUserDto {
      @NotBlank private String nickname;
      private String bio;
  }
  ```

### Path Traversal Prevention

- **Rule**: [MUST] Block `../` patterns when using user input in file paths.
- **Rule**: [MUST] Allow file path access only within permitted base directories.
- **Good example**:
  ```typescript
  import * as path from 'path';

  @Injectable()
  export class FileService {
    private readonly BASE_UPLOAD_DIR = '/app/uploads';

    async getFile(fileName: string): Promise<Buffer> {
      const sanitizedName = path.basename(fileName);
      const resolvedPath = path.resolve(this.BASE_UPLOAD_DIR, sanitizedName);
      if (!resolvedPath.startsWith(this.BASE_UPLOAD_DIR)) {
        throw new BadRequestException('Unauthorized file path.');
      }
      return fs.readFile(resolvedPath);
    }
  }
  ```

## Transport Security

### HTTPS/TLS Enforcement

- **Rule**: [MUST] All API communication must use HTTPS in production environments.
- **Rule**: [MUST] Redirect HTTP requests to HTTPS.

### CORS Configuration

- **Rule**: [MUST] CORS allowed origins must be explicitly configured using a whitelist approach. Wildcard (`*`) is prohibited.
- **Rule**: [MUST] Wildcard origins cannot be used when using credentials.
- **Good example**:
  ```typescript
  // NestJS
  app.enableCors({
    origin: ['https://example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    maxAge: 3600,
  });
  ```
  ```java
  // Spring
  @Configuration
  public class CorsConfig implements WebMvcConfigurer {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
          registry.addMapping("/api/**")
              .allowedOrigins("https://example.com", "https://admin.example.com")
              .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
              .allowCredentials(true).maxAge(3600);
      }
  }
  ```

### Security HTTP Headers

- **Rule**: [MUST] Use the `helmet` middleware in NestJS and the `headers()` configuration of Spring Security in Spring.

| Header | Value | Description |
|------|-----|------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforce HTTPS (HSTS) |
| `Content-Security-Policy` | `default-src 'self'` | Prevent XSS and data injection |

- **Good example**:
  ```typescript
  // NestJS
  import helmet from 'helmet';
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));
  ```
  ```java
  // Spring Security
  http.headers(headers -> headers
      .contentTypeOptions(Customizer.withDefaults())
      .frameOptions(frame -> frame.deny())
      .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000).includeSubDomains(true))
      .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
  );
  ```

### Cookie Security

- **Rule**: [MUST] Set `HttpOnly`, `Secure`, and `SameSite` attributes on authentication-related Cookies.

| Attribute | Description |
|------|------|
| `HttpOnly` | Inaccessible via JavaScript `document.cookie` |
| `Secure` | Cookie transmitted only over HTTPS connections |
| `SameSite` | Restrict cookie transmission on cross-site requests using `Strict` or `Lax` |

- **Good example**:
  ```typescript
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
  ```

### CSRF Prevention

- **Rule**: [SHOULD] `SameSite` Cookie and Bearer token-based APIs do not require a separate CSRF token.
- **Rule**: [MUST] Apply a CSRF token when using cookie-based session authentication.
- **Good example**:
  ```java
  // Spring Security - Enable CSRF when using cookie-based sessions
  http.csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
      .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));
  ```
> [MUST NOT] Do not disable CSRF in cookie-based sessions.

## Sensitive Data Management

### Secret/Environment Variable Management

- **Rule**: [MUST] Do not hardcode DB passwords, API Keys, JWT Secrets, etc. in source code.
- **Rule**: [MUST] Include `.env` files in `.gitignore`.
- **Rule**: [SHOULD] Use secret management tools such as AWS Secrets Manager or HashiCorp Vault in production environments.
- **Good example**:
  ```typescript
  // NestJS - Using environment variables with ConfigModule
  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: `.env.${process.env.NODE_ENV || 'development'}` }),
      JwtModule.registerAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
        }),
      }),
    ],
  })
  export class AppModule {}
  ```
  ```gitignore
  .env
  .env.*
  !.env.example
  ```

### Prohibit Logging Sensitive Data

- **Rule**: [MUST NOT] Do not output sensitive information such as passwords, tokens, credit card numbers, or resident registration numbers in logs.
- **Rule**: [SHOULD] Apply masking when sensitive data must be included in logs.

| Data | Masking Example |
|--------|------------|
| Email | `u***@example.com` |
| Phone number | `010-****-5678` |
| Credit card number | `****-****-****-1234` |
| Resident registration number | `900101-*******` |

- **Good example**:
  ```typescript
  export class MaskingUtil {
    static maskEmail(email: string): string {
      const [local, domain] = email.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }
    static maskPhone(phone: string): string {
      return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
    }
  }

  this.logger.log(`Order processing complete: userId=${userId}, email=${MaskingUtil.maskEmail(email)}`);
  ```

### Exclude Sensitive Information from API Responses

- **Rule**: [MUST] Explicitly select fields to expose through ResponseDto (whitelist approach).
- **Rule**: [MUST NOT] Do not return Entity directly as an API response.

> Refer to API_SPEC_CONVENTION.md for detailed anti-patterns on sensitive information exposure in responses.

- **Good example**:
  ```typescript
  // Explicitly select exposed fields with ResponseDto
  export class UserResponseDto {
    @Expose() id: string;
    @Expose() email: string;
    @Expose() nickname: string;
    // password, refreshToken, etc. are not included
  }

  @Injectable()
  export class UserService {
    async getUser(id: string): Promise<UserResponseDto> {
      const user = await this.userRepository.findOneBy({ id });
      return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    }
  }
  ```

### Encryption

- **Rule**: [MUST] Hash passwords one-way using bcrypt.
- **Rule**: [SHOULD] Encrypt sensitive personal information (resident registration numbers, card numbers, etc.) using AES-256 or similar when storing.
- **Rule**: [MUST] Do not include encryption keys in source code; manage them with secret management tools.
- **Good example**:
  ```typescript
  import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

  @Injectable()
  export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;

    constructor(private configService: ConfigService) {
      const secret = this.configService.get<string>('ENCRYPTION_KEY');
      this.key = scryptSync(secret, 'salt', 32);
    }

    encrypt(plainText: string): string {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(encryptedText: string): string {
      const [ivHex, authTagHex, dataHex] = encryptedText.split(':');
      const decipher = createDecipheriv(this.algorithm, this.key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
    }
  }
  ```

### PII (Personally Identifiable Information) Handling

- **Rule**: [MUST] Destroy or de-identify personal information without delay after the collection purpose has been fulfilled.
- **Rule**: [SHOULD] Record access logs when processing personal information.
- **Rule**: [SHOULD] Encrypt personal information DB columns or separate them into dedicated tables.
- **Good example**:
  ```typescript
  @Entity()
  export class UserPersonalInfo {
    @PrimaryColumn() userId: string;
    @Column({ type: 'varchar', transformer: encryptTransformer }) residentNumber: string;
    @Column({ type: 'varchar', transformer: encryptTransformer }) phoneNumber: string;
    @Column({ type: 'timestamp', nullable: true }) retentionExpiry: Date;
  }

  @Injectable()
  export class PersonalInfoService {
    async getPersonalInfo(userId: string, requesterId: string): Promise<UserPersonalInfo> {
      await this.auditLogger.log({ action: 'READ_PERSONAL_INFO', targetUserId: userId, requesterId, timestamp: new Date() });
      return this.personalInfoRepo.findOneBy({ userId });
    }

    async purgeExpiredPersonalInfo(): Promise<void> {
      await this.personalInfoRepo.delete({ retentionExpiry: LessThan(new Date()) });
    }
  }
  ```

## Dependency and Supply Chain Security

### Dependency Security Scanning

- **Rule**: [MUST] Automate dependency vulnerability scanning in the CI pipeline (`npm audit`, `yarn audit`).
- **Rule**: [SHOULD] Use automated vulnerability detection tools such as Snyk, Dependabot, or Renovate.
- **Good example**:
  ```yaml
  # GitHub Actions CI
  name: Security Audit
  on:
    push: { branches: [main, develop] }
    pull_request: { branches: [main] }
    schedule: [{ cron: '0 9 * * 1' }]
  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: npm ci
        - run: npm audit --audit-level=high
        - uses: snyk/actions/node@master
          env: { SNYK_TOKEN: '${{ secrets.SNYK_TOKEN }}' }
  ```

### Lock File Management

- **Rule**: [MUST] Always commit `package-lock.json` or `yarn.lock`.
- **Rule**: [MUST NOT] Do not include lock files in `.gitignore`.

### Third-Party Library Selection Criteria

- **Rule**: [SHOULD] Consider the following criteria when selecting libraries.

| Criteria | Checklist |
|------|----------|
| Maintenance status | Verify the last update was within 6 months |
| Security vulnerabilities | Verify no known vulnerabilities in Snyk or npm audit |
| Community size | Weekly download count, GitHub stars, issue response time |
| License compatibility | Verify the license is compatible with commercial projects (MIT, Apache 2.0, etc.) |

## Request Limiting and Service Protection

### Request Body Size Limit

- **Rule**: [MUST] Set a maximum request body size on the API server.
- **Good example**:
  ```typescript
  // NestJS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));
  ```
  ```yaml
  # Spring
  server:
    tomcat:
      max-http-form-post-size: 1MB
  spring:
    servlet:
      multipart:
        max-file-size: 10MB
        max-request-size: 10MB
  ```

### Rate Limiting

> Rate Limiting rules are defined in API_SPEC_CONVENTION.md.

### Request Timeout Configuration

- **Rule**: [MUST] Set appropriate Timeouts for the API server and external API calls.

| Target | Recommended Timeout | Description |
|------|-------------|------|
| API server response | 30 seconds | Maximum response time to client |
| External API calls | 5~10 seconds | Maximum wait time for external service calls |
| DB queries | 5 seconds | Maximum execution time for database queries |

- **Good example**:
  ```typescript
  // NestJS - Setting Timeout in HttpModule
  @Module({
    imports: [HttpModule.register({ timeout: 5000, maxRedirects: 3 })],
  })
  export class ExternalApiModule {}
  ```

### Slowloris/DDoS Basic Defense

- **Rule**: [SHOULD] Configure connection limits and request rate limits on reverse proxies (Nginx, CloudFront, etc.).
- **Rule**: [SHOULD] Use a WAF (Web Application Firewall) in cloud environments.
- **Good example**:
  ```nginx
  http {
      limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
      limit_conn conn_limit 10;
      limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;
      server {
          location /api/ {
              limit_req zone=req_limit burst=20 nodelay;
              client_body_timeout 10s;
              client_header_timeout 10s;
              keepalive_timeout 15s;
          }
      }
  }
  ```

## Security Logging and Auditing

### Mandatory Audit Log Events

- **Rule**: [MUST] The following security-related events must be recorded in audit logs.

| Event | Log Content |
|--------|----------|
| Login success/failure | User ID, IP address, User-Agent, timestamp, success/failure status |
| Password change | User ID, change timestamp, change request IP |
| Permission change | Target user ID, permissions before/after change, changer ID, timestamp |
| Data deletion | Deletion target (table, ID), deleter ID, timestamp |
| Sensitive data access | Accessor ID, access target, timestamp, IP address |
| API Key creation/deletion | Target Key (masked), creator/deleter ID, timestamp |

- **Good example**:
  ```typescript
  interface AuditLog {
    eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'PASSWORD_CHANGE' | 'PERMISSION_CHANGE' | 'DATA_DELETE' | 'SENSITIVE_DATA_ACCESS' | 'API_KEY_CREATE' | 'API_KEY_DELETE';
    userId: string;
    ipAddress: string;
    userAgent?: string;
    targetResource?: string;
    previousValue?: string;
    newValue?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }
  ```

### Prohibit Sensitive Information in Logs

> Refer to the [Prohibit Logging Sensitive Data](#prohibit-logging-sensitive-data) section.

### Security Event Monitoring

- **Rule**: [SHOULD] Monitor consecutive login failures (5 or more), abnormal access patterns, etc. in real-time and trigger alerts.
- **Rule**: [SHOULD] Apply an account lockout policy: lock the account for a certain period after N consecutive login failures.
- **Good example**:
  ```typescript
  @Injectable()
  export class LoginAttemptService {
    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

    async recordFailure(userId: string, ip: string): Promise<void> {
      const key = `login_attempts:${userId}`;
      const attempts = ((await this.cacheManager.get<number>(key)) ?? 0) + 1;
      await this.cacheManager.set(key, attempts, 30 * 60 * 1000); // TTL 30 minutes
      if (attempts >= 5) {
        // Trigger alert on 5 or more failures
        await this.auditLogService.log({
          eventType: 'LOGIN_FAILURE', userId, ipAddress: ip, timestamp: new Date(),
          metadata: { consecutiveFailures: attempts, alert: 'BRUTE_FORCE_SUSPECTED' },
        });
      }
    }

    async isLocked(userId: string): Promise<boolean> {
      return ((await this.cacheManager.get<number>(`login_attempts:${userId}`)) ?? 0) >= 5;
    }
  }
  ```

## Security Testing

### OWASP Top 10 Based Security Checklist

- **Rule**: [SHOULD] Check the following OWASP Top 10 items during code reviews.

| Rank | Vulnerability | Checklist |
|------|--------|----------|
| A01 | Broken Access Control | Whether authentication/authorization Guard is applied, resource owner verification |
| A02 | Cryptographic Failures | Sensitive data encryption, HTTPS enforcement, secure hash algorithms |
| A03 | Injection | SQL parameter binding, input validation (DTO), XSS filtering |
| A04 | Insecure Design | Business logic security, threat modeling reflection |
| A05 | Security Misconfiguration | Whether default settings are changed, unnecessary features/ports disabled |
| A06 | Vulnerable Components | Dependency vulnerability scanning, library updates |
| A07 | Auth Failures | JWT expiration settings, password policies, Refresh Token Rotation |
| A08 | Integrity Failures | CI/CD pipeline security, dependency integrity verification |
| A09 | Logging Failures | Audit log recording, security event monitoring |
| A10 | SSRF | External URL input validation, internal network access blocking |

### Static Analysis Tools

- **Rule**: [SHOULD] Use the ESLint security plugin (`eslint-plugin-security`).
- **Rule**: [MAY] Integrate static analysis tools such as SonarQube into CI.
- **Good example**:
  ```javascript
  // .eslintrc.js
  module.exports = {
    plugins: ['security'],
    extends: ['plugin:security/recommended-legacy'],
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-non-literal-require': 'warn',
    },
  };
  ```

### Dependency Vulnerability CI Automated Checks

> Refer to the [Dependency Security Scanning](#dependency-security-scanning) section.

### Penetration Testing

- **Rule**: [SHOULD] Perform penetration testing before major releases.
- **Rule**: [MAY] Perform basic scanning with automated tools such as OWASP ZAP.
- **Good example**:
  ```bash
  docker run -t zaproxy/zap-stable zap-baseline.py -t https://staging.example.com -r zap-report.html
  ```

## Anti-Patterns

### 1. Hardcoded Secrets

- **Rule**: Do not write passwords, API Keys, JWT Secrets, etc. directly in source code.
- **Solution**: Refer to [Secret/Environment Variable Management](#secretenvironment-variable-management).

### 2. Stack Trace Exposure in Error Responses

- **Rule**: Do not expose stack traces, SQL queries, file paths, etc. to clients in production environments.
- **Solution**: Use a global Exception Filter to return only safe error messages.

### 3. CORS Wildcard Allowed

- **Rule**: Using `origin: '*'` or `origin: true` is prohibited.
- **Solution**: Refer to [CORS Configuration](#cors-configuration).

### 4. Trusting User Input Without Validation

- **Rule**: Do not use user input directly without DTO validation.
- **Solution**: Refer to [Input Validation Principles](#input-validation-principles).

### 5. Storing/Transmitting Sensitive Data in Plaintext

- **Rule**: Storing passwords in plaintext or storing personal information without encryption is prohibited.
- **Solution**: Refer to [Password Handling](#password-handling) and [Encryption](#encryption).

### 6. Indefinite JWT Expiration

- **Rule**: Not setting `expiresIn` or using excessively long expiration times (e.g., 1 year) is prohibited.
- **Solution**: Access Token 15 min ~ 1 hour, Refresh Token 7 ~ 30 days. Refer to [JWT Token Management](#jwt-token-management).