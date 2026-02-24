# 보안 컨벤션

> 이 문서는 백엔드 애플리케이션의 보안 규칙을 정의합니다.
> 인증/인가, 입력 검증, 데이터 보호 등 보안과 관련된 모든 규칙을 다룹니다.
>
> 상위 규칙: [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md)
>
> 관련 문서:
> - [NestJS 컨벤션 (Guard 구현)](../nestjs/NESTJS_CONVENTION.md)
> - [Spring 컨벤션 (SecurityConfig)](../spring/SPRING_CONVENTION.md)
> - [TypeORM 컨벤션 (파라미터 바인딩)](../typeorm/TYPEORM_CONVENTION.md)
> - [API Spec 컨벤션](../api-spec/API_SPEC_CONVENTION.md)

## 인증/인가

### JWT 토큰 관리

- **규칙**: [MUST] 인증에는 JWT(JSON Web Token)를 사용하고, Access Token과 Refresh Token을 분리한다.
- **이유**: Access Token의 수명을 짧게 유지하여 토큰 탈취 시 피해를 최소화하고, Refresh Token으로 사용자 경험을 유지한다.

| 토큰 | 수명 | 저장 위치 | 용도 |
|------|------|----------|------|
| Access Token | 15분 ~ 1시간 (TBD) | 메모리 또는 HTTP Header | API 인증 |
| Refresh Token | 7일 ~ 30일 (TBD) | HttpOnly Cookie 또는 DB | Access Token 갱신 |

### JWT 서명 알고리즘

- **규칙**: [MUST] JWT 서명 알고리즘은 최소 HS256(HMAC-SHA256) 이상을 사용한다.
- **규칙**: [SHOULD] 운영(production) 환경에서는 RS256(RSA-SHA256) 비대칭 알고리즘을 사용한다.
- **이유**: HS256은 서명과 검증에 동일한 비밀키를 사용하므로, 키가 노출되면 토큰 위조가 가능하다. RS256은 비밀키(서명)와 공개키(검증)를 분리하여, 검증 측에서는 공개키만 보유하면 되므로 키 관리 보안이 강화된다. 마이크로서비스 환경에서 공개키만 배포하면 각 서비스가 독립적으로 토큰을 검증할 수 있다.
- **좋은 예시**:
  ```typescript
  // NestJS - RS256 비대칭 알고리즘 사용
  import { JwtModule } from '@nestjs/jwt';
  import * as fs from 'fs';

  @Module({
    imports: [
      JwtModule.register({
        privateKey: fs.readFileSync('keys/private.pem'),
        publicKey: fs.readFileSync('keys/public.pem'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '15m',
        },
      }),
    ],
  })
  export class AuthModule {}
  ```
- **나쁜 예시**:
  ```typescript
  // 약한 알고리즘 사용 또는 알고리즘 미지정
  JwtModule.register({
    secret: 'my-secret',
    signOptions: {
      algorithm: 'none', // 서명 없음 - 토큰 위조 가능!
    },
  })
  ```

### 토큰 페이로드

- **규칙**: [MUST NOT] JWT 토큰 페이로드에 민감 정보(비밀번호, 주민등록번호, 카드번호 등)를 포함하지 않는다.
- **이유**: JWT 페이로드는 Base64 인코딩일 뿐 암호화가 아니므로, 누구나 디코딩하여 내용을 확인할 수 있다. 토큰이 로그에 남거나 클라이언트 저장소에 캐시될 때 민감 정보가 노출된다.
- **규칙**: [SHOULD] 토큰 페이로드에는 인증/인가에 필요한 최소한의 정보만 포함한다.
- **이유**: 페이로드가 커지면 매 요청마다 전송되는 토큰 크기가 증가하여 네트워크 오버헤드가 발생한다.
- **좋은 예시**:
  ```typescript
  // 토큰 페이로드에 최소 정보만 포함
  const payload = {
    sub: user.id,          // 사용자 식별자
    role: user.role,       // 역할 (인가에 필요)
    iat: Math.floor(Date.now() / 1000),
  };
  const accessToken = this.jwtService.sign(payload);
  ```
- **나쁜 예시**:
  ```typescript
  // 토큰에 민감 정보 포함 - Base64 디코딩으로 모두 노출됨
  const payload = {
    sub: user.id,
    email: user.email,
    phone: user.phone,           // 개인 정보
    address: user.address,       // 개인 정보
    creditCard: user.cardNumber, // 민감 금융 정보!
  };
  ```

### Refresh Token Rotation

- **규칙**: [SHOULD] Refresh Token Rotation 전략을 적용한다. Refresh Token으로 Access Token을 갱신할 때, 새로운 Refresh Token도 함께 발급하고 기존 Refresh Token은 즉시 무효화한다.
- **이유**: Refresh Token이 탈취되더라도, 정당한 사용자가 먼저 토큰을 갱신하면 탈취된 Refresh Token이 무효화되어 피해를 최소화한다. 탈취자가 무효화된 토큰으로 갱신을 시도하면 이를 감지하여 해당 사용자의 모든 세션을 강제 만료시킬 수 있다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class AuthService {
    async refreshTokens(currentRefreshToken: string): Promise<TokenPair> {
      // 1. 현재 Refresh Token 검증
      const payload = await this.jwtService.verifyAsync(currentRefreshToken);
      const storedToken = await this.refreshTokenRepository.findOneBy({
        token: currentRefreshToken,
        userId: payload.sub,
        isRevoked: false,
      });

      if (!storedToken) {
        // 이미 사용(무효화)된 토큰으로 갱신 시도 - 토큰 탈취 의심
        // 해당 사용자의 모든 Refresh Token을 무효화
        await this.refreshTokenRepository.update(
          { userId: payload.sub },
          { isRevoked: true },
        );
        throw new UnauthorizedException('비정상적인 토큰 갱신이 감지되었습니다.');
      }

      // 2. 기존 Refresh Token 무효화
      await this.refreshTokenRepository.update(
        { id: storedToken.id },
        { isRevoked: true },
      );

      // 3. 새로운 Access Token + Refresh Token 발급
      const newAccessToken = this.jwtService.sign({ sub: payload.sub, role: payload.role });
      const newRefreshToken = this.jwtService.sign(
        { sub: payload.sub },
        { expiresIn: '30d' },
      );

      // 4. 새 Refresh Token 저장
      await this.refreshTokenRepository.save({
        token: newRefreshToken,
        userId: payload.sub,
        isRevoked: false,
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Refresh Token을 재사용 - 탈취 시 만료까지 무한 갱신 가능
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.jwtService.verifyAsync(refreshToken);
    const newAccessToken = this.jwtService.sign({ sub: payload.sub });
    // Refresh Token은 그대로 재사용 - 탈취 감지 불가!
    return { accessToken: newAccessToken, refreshToken };
  }
  ```

### 인증 헤더

- **규칙**: [MUST] 인증 토큰은 `Authorization` 헤더에 Bearer 스킴으로 전송한다.
- **이유**: RFC 6750에 정의된 표준 Bearer Token 전달 방식이며, OAuth 2.0 생태계와의 호환성을 보장한다.
- **좋은 예시**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  ```
- **나쁜 예시**:
  ```
  X-Auth-Token: eyJhbGciOiJIUzI1NiIs...
  Token: eyJhbGciOiJIUzI1NiIs...
  ```

### 역할 기반 접근 제어 (RBAC)

- **규칙**: [SHOULD] 역할(Role) 기반 권한 체계를 사용한다.
- **이유**: 사용자별 개별 권한 관리보다 역할 단위로 관리하는 것이 확장성 있고 관리가 용이하다. 새 기능이 추가되어도 역할에 권한을 할당하면 해당 역할의 모든 사용자에게 일괄 적용된다.
- **좋은 예시**:
  ```typescript
  // NestJS - 역할 기반으로 API 접근을 제어한다
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('/users/:id')
  async deleteUser(@Param('id') id: string) { ... }
  ```
  ```java
  // Spring - SecurityConfig에서 역할 기반 접근 제어
  @Configuration
  @EnableWebSecurity
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
- **나쁜 예시**:
  ```typescript
  // Controller 메서드 안에서 직접 역할 검사 - Guard를 사용해야 한다
  @Delete('/users/:id')
  async deleteUser(@Req() req: Request, @Param('id') id: string) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
    return this.userService.deleteUser(id);
  }
  ```

### 비밀번호 처리

- **규칙**: [MUST] 비밀번호는 bcrypt 등의 단방향 해시 알고리즘으로 저장한다. 평문 저장은 절대 금지한다.
- **이유**: 데이터베이스가 유출되더라도 단방향 해시는 원본 비밀번호를 복원할 수 없어 피해를 최소화한다. bcrypt는 솔트(salt)를 자동으로 포함하고 연산 비용을 조절할 수 있어, 브루트포스 공격에 강하다.
- **규칙**: [MUST NOT] API 응답에 비밀번호 해시를 포함하지 않는다.
- **이유**: 해시가 노출되면 오프라인 브루트포스 공격의 대상이 된다.
- **좋은 예시**:
  ```typescript
  import * as bcrypt from 'bcrypt';

  @Injectable()
  export class UserService {
    private readonly SALT_ROUNDS = 12;

    async createUser(dto: CreateUserDto): Promise<User> {
      const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
      return this.userRepository.save({
        email: dto.email,
        password: hashedPassword,
      });
    }

    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
      return bcrypt.compare(plainPassword, hashedPassword);
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 비밀번호 평문 저장 - 절대 금지!
  async createUser(dto: CreateUserDto): Promise<User> {
    return this.userRepository.save({
      email: dto.email,
      password: dto.password, // 평문 그대로 저장
    });
  }

  // API 응답에 비밀번호 해시 포함 - 금지!
  async getUser(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
    // password 필드가 응답에 포함됨
  }
  ```

## 입력 검증 및 데이터 보호

### 입력 검증 원칙

- **규칙**: [MUST] 모든 사용자 입력은 서버 사이드에서 반드시 검증한다. 클라이언트 측 검증에만 의존하지 않는다.
- **이유**: 클라이언트 측 검증은 사용자 경험을 위한 것이며, 브라우저 개발자 도구나 API 직접 호출로 쉽게 우회할 수 있다. 서버 사이드 검증만이 데이터 무결성과 보안을 보장한다.
- **규칙**: [MUST] 입력 검증은 화이트리스트(허용 목록) 기반으로 수행한다. 허용된 값만 통과시킨다.
- **이유**: 블랙리스트(차단 목록) 방식은 새로운 공격 패턴을 예측할 수 없어 우회될 가능성이 높다. 화이트리스트 방식은 허용된 값만 통과시키므로 알 수 없는 공격에도 안전하다.
- **좋은 예시**:
  ```typescript
  // NestJS - ValidationPipe + DTO로 화이트리스트 기반 검증
  // main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // DTO에 정의되지 않은 속성 자동 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
      transform: true,            // 타입 자동 변환
    }),
  );
  ```
  ```typescript
  // DTO에 명시된 필드만 허용 (화이트리스트)
  export class CreateOrderDto {
    @IsString()
    @MaxLength(100)
    productName: string;

    @IsNumber()
    @Min(1)
    @Max(9999)
    quantity: number;

    @IsEnum(OrderStatus)
    status: OrderStatus;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 입력 검증 없이 요청 본문을 그대로 사용 - 모든 공격에 취약
  @Post('/orders')
  async createOrder(@Body() body: any) {
    return this.orderService.createOrder(body);
  }
  ```

### SQL Injection 방지

- **규칙**: [MUST] SQL 쿼리에 사용자 입력을 포함할 때 반드시 파라미터 바인딩을 사용한다. 문자열 보간(interpolation)이나 문자열 연결(concatenation)로 쿼리를 작성하지 않는다.
- **이유**: 문자열 보간으로 쿼리를 작성하면 사용자가 입력에 SQL 구문을 삽입하여 데이터 조회, 수정, 삭제 등 의도하지 않은 쿼리를 실행할 수 있다.

> 파라미터 바인딩의 구체적인 사용법은 [TypeORM 컨벤션의 파라미터 바인딩 섹션](../typeorm/TYPEORM_CONVENTION.md)을 참조한다.

- **좋은 예시**:
  ```typescript
  // TypeORM QueryBuilder - 파라미터 바인딩 사용
  const users = await this.userRepository
    .createQueryBuilder('user')
    .where('user.email = :email', { email: userInput })
    .andWhere('user.status = :status', { status })
    .getMany();
  ```
  ```java
  // Spring Data JPA - 파라미터 바인딩 사용
  @Query("SELECT u FROM User u WHERE u.email = :email AND u.status = :status")
  List<User> findByEmailAndStatus(@Param("email") String email, @Param("status") String status);
  ```
- **나쁜 예시**:
  ```typescript
  // SQL Injection 취약! - 문자열 보간으로 사용자 입력 직접 삽입
  const users = await this.userRepository
    .createQueryBuilder('user')
    .where(`user.email = '${userInput}'`) // userInput에 SQL 구문 삽입 가능
    .getMany();
  // 공격 예: userInput = "' OR '1'='1" → 모든 사용자 데이터 노출
  ```
  ```java
  // SQL Injection 취약! - 문자열 연결
  String query = "SELECT * FROM users WHERE email = '" + userInput + "'";
  entityManager.createNativeQuery(query);
  ```

### XSS(Cross-Site Scripting) 방지

- **규칙**: [MUST] 사용자 입력을 HTML로 출력할 때 반드시 이스케이핑(escaping)을 수행한다.
- **이유**: 사용자가 입력한 스크립트 코드(`<script>`)가 다른 사용자의 브라우저에서 실행되면, 세션 탈취, 피싱, 악성 코드 실행 등의 공격이 가능하다.
- **규칙**: [MUST NOT] 사용자 입력을 검증 없이 HTML에 직접 삽입하지 않는다.
- **규칙**: [SHOULD] 사용자가 입력한 HTML 콘텐츠를 저장/표시해야 하는 경우, `sanitize-html` 등의 라이브러리로 허용된 태그만 남기고 나머지를 제거(sanitize)한다.
- **이유**: 게시판, 댓글 등에서 사용자가 입력한 HTML을 그대로 저장하면 저장형(Stored) XSS 공격이 발생할 수 있다. 허용된 태그 목록(화이트리스트)만 남기는 것이 안전하다.
- **좋은 예시**:
  ```typescript
  import * as sanitizeHtml from 'sanitize-html';

  @Injectable()
  export class ContentService {
    sanitizeUserContent(rawHtml: string): string {
      return sanitizeHtml(rawHtml, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
        allowedAttributes: {
          a: ['href', 'title'],
        },
        allowedSchemes: ['http', 'https'],  // javascript: 스킴 차단
      });
    }
  }

  // 사용
  @Post('/posts')
  async createPost(@Body() dto: CreatePostDto) {
    const sanitizedContent = this.contentService.sanitizeUserContent(dto.content);
    return this.postService.create({ ...dto, content: sanitizedContent });
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 사용자 입력을 검증 없이 그대로 저장 - Stored XSS 취약!
  @Post('/posts')
  async createPost(@Body() dto: CreatePostDto) {
    return this.postService.create(dto);
    // dto.content에 <script>alert('XSS')</script>가 포함될 수 있음
  }
  ```

### Mass Assignment 방지

- **규칙**: [MUST] DTO에 정의된 필드만 허용하고, 요청에 포함된 정의되지 않은 필드는 거부하거나 무시한다.
- **이유**: 공격자가 요청 본문에 `isAdmin: true`, `role: 'admin'`, `price: 0` 등 의도하지 않은 필드를 추가하여 권한 상승이나 데이터 조작을 시도할 수 있다.

> NestJS의 `ValidationPipe` 설정은 [NestJS 컨벤션의 Pipe 사용 섹션](../nestjs/NESTJS_CONVENTION.md)을 참조한다.

- **좋은 예시**:
  ```typescript
  // main.ts - ValidationPipe에서 whitelist 옵션 활성화
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // DTO에 없는 필드 자동 제거
      forbidNonWhitelisted: true, // DTO에 없는 필드가 있으면 400 에러
    }),
  );

  // DTO에 허용할 필드만 정의
  export class UpdateUserDto {
    @IsString()
    @IsOptional()
    nickname?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    // isAdmin, role 등은 정의하지 않음 → 요청에 포함되면 거부됨
  }
  ```
  ```java
  // Spring - @JsonIgnoreProperties로 허용하지 않는 필드 무시
  @JsonIgnoreProperties(ignoreUnknown = true)
  public class UpdateUserDto {
      @NotBlank
      private String nickname;

      private String bio;

      // setter 없는 필드는 바인딩되지 않음
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 요청 본문을 그대로 Entity에 전달 - Mass Assignment 취약!
  @Patch('/users/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.userRepository.update(id, body);
    // body에 { isAdmin: true }가 포함되면 권한 상승 발생!
  }
  ```

### Path Traversal 방지

- **규칙**: [MUST] 사용자 입력을 파일 경로에 사용할 때 `../`(상위 디렉토리 탐색) 패턴을 차단한다.
- **규칙**: [MUST] 파일 경로는 허용된 기본 디렉토리(base directory) 내에서만 접근을 허용한다. 절대 경로를 정규화(normalize)한 후 기본 디렉토리 접두사를 검증한다.
- **이유**: 공격자가 `../../etc/passwd`와 같은 경로를 입력하여 서버의 임의 파일을 읽거나 덮어쓸 수 있다. 기본 디렉토리를 벗어나는 모든 접근을 차단해야 한다.
- **좋은 예시**:
  ```typescript
  import * as path from 'path';
  import * as fs from 'fs/promises';

  @Injectable()
  export class FileService {
    private readonly BASE_UPLOAD_DIR = '/app/uploads';

    async getFile(fileName: string): Promise<Buffer> {
      // 1. 파일명에서 경로 구분자 제거
      const sanitizedName = path.basename(fileName);

      // 2. 절대 경로 생성 및 정규화
      const resolvedPath = path.resolve(this.BASE_UPLOAD_DIR, sanitizedName);

      // 3. 기본 디렉토리 내부인지 검증
      if (!resolvedPath.startsWith(this.BASE_UPLOAD_DIR)) {
        throw new BadRequestException('허용되지 않은 파일 경로입니다.');
      }

      return fs.readFile(resolvedPath);
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 사용자 입력을 경로에 그대로 사용 - Path Traversal 취약!
  @Get('/files/:fileName')
  async getFile(@Param('fileName') fileName: string) {
    const filePath = `/app/uploads/${fileName}`;
    return fs.readFile(filePath);
    // fileName = "../../etc/passwd" → 서버의 패스워드 파일 노출!
  }
  ```

## 전송 보안

### HTTPS/TLS 강제

- **규칙**: [MUST] 운영 환경에서 모든 API 통신은 HTTPS를 사용한다.
- **규칙**: [MUST] HTTP 요청은 HTTPS로 리다이렉트한다.
- **이유**: 평문 HTTP는 중간자 공격(MITM)에 취약하며, 전송 중인 데이터(인증 토큰, 개인정보 등)가 네트워크에서 도청될 수 있다.
- **좋은 예시**:
  ```typescript
  // NestJS - HTTP → HTTPS 리다이렉트 (리버스 프록시 또는 미들웨어)
  // main.ts
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // HSTS 헤더를 통해 브라우저가 HTTPS만 사용하도록 강제
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });

    await app.listen(3000);
  }
  bootstrap();
  ```
- **나쁜 예시**:
  ```typescript
  // 운영 환경에서 HTTP로 서비스 - 모든 통신이 평문으로 노출
  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(3000); // HTTP only - MITM 공격에 취약!
  }
  ```

### CORS 설정

- **규칙**: [MUST] CORS 허용 오리진은 화이트리스트 방식으로 명시적으로 설정한다. 와일드카드(`*`) 금지.
- **규칙**: [MUST] credentials를 사용하는 경우 와일드카드 오리진을 사용할 수 없다.
- **이유**: 와일드카드 오리진은 모든 외부 사이트에서 API를 호출할 수 있게 하여, CSRF와 데이터 유출의 위험을 높인다. 특히 credentials(쿠키, 인증 헤더)를 포함한 요청은 신뢰할 수 있는 오리진에서만 허용해야 한다.
- **좋은 예시**:
  ```typescript
  // NestJS - 허용 오리진을 명시적으로 지정
  // main.ts
  app.enableCors({
    origin: ['https://example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    maxAge: 3600,
  });
  ```
  ```java
  // Spring - WebMvcConfigurer로 CORS 설정
  @Configuration
  public class CorsConfig implements WebMvcConfigurer {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
          registry.addMapping("/api/**")
              .allowedOrigins("https://example.com", "https://admin.example.com")
              .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
              .allowCredentials(true)
              .maxAge(3600);
      }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 모든 오리진 허용 - 외부 사이트에서 API 호출 가능!
  app.enableCors({
    origin: '*', // 와일드카드 - 모든 오리진 허용
  });

  // 또는
  app.enableCors({
    origin: true, // 모든 오리진 반사(mirror) - 와일드카드와 동일한 효과
    credentials: true, // credentials와 함께 사용 시 특히 위험
  });
  ```

### 보안 HTTP 헤더

- **규칙**: [MUST] NestJS에서는 `helmet` 미들웨어를 사용하여 보안 헤더를 설정한다.
- **규칙**: [MUST] Spring에서는 Spring Security의 `headers()` 설정을 사용한다.
- **이유**: 보안 HTTP 헤더는 브라우저에서 발생하는 다양한 공격(XSS, 클릭재킹, MIME 스니핑 등)을 방지하는 첫 번째 방어선이다.

| 헤더 | 값 | 설명 |
|------|-----|------|
| `X-Content-Type-Options` | `nosniff` | MIME 타입 스니핑 방지 |
| `X-Frame-Options` | `DENY` | 클릭재킹(iframe 삽입) 방지 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS 강제 (HSTS) |
| `Content-Security-Policy` | `default-src 'self'` | XSS 및 데이터 인젝션 공격 방지 |

- **좋은 예시**:
  ```typescript
  // NestJS - helmet 미들웨어 사용
  import helmet from 'helmet';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
        },
      }),
    );

    await app.listen(3000);
  }
  ```
  ```java
  // Spring Security - 보안 헤더 설정
  @Configuration
  @EnableWebSecurity
  public class SecurityConfig {
      @Bean
      public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
          http.headers(headers -> headers
              .contentTypeOptions(Customizer.withDefaults())          // X-Content-Type-Options: nosniff
              .frameOptions(frame -> frame.deny())                    // X-Frame-Options: DENY
              .httpStrictTransportSecurity(hsts -> hsts
                  .maxAgeInSeconds(31536000)
                  .includeSubDomains(true))                           // HSTS
              .contentSecurityPolicy(csp ->
                  csp.policyDirectives("default-src 'self'"))         // CSP
          );
          return http.build();
      }
  }
  ```

### Cookie 보안

- **규칙**: [MUST] 인증 관련 Cookie에는 `HttpOnly`, `Secure`, `SameSite` 속성을 설정한다.
- **이유**: 보안 속성이 없는 Cookie는 XSS를 통한 탈취, 비암호화 채널에서의 도청, CSRF 공격에 취약하다.

| 속성 | 설명 |
|------|------|
| `HttpOnly` | JavaScript에서 `document.cookie`로 접근 불가 → XSS를 통한 쿠키 탈취 방지 |
| `Secure` | HTTPS 연결에서만 쿠키 전송 → 평문 HTTP에서 쿠키 도청 방지 |
| `SameSite` | `Strict` 또는 `Lax`로 설정하여 크로스사이트 요청 시 쿠키 전송 제한 → CSRF 방지 |

- **좋은 예시**:
  ```typescript
  // NestJS - Refresh Token을 HttpOnly Cookie로 설정
  import { Response } from 'express';

  @Controller('auth')
  export class AuthController {
    @Post('login')
    async login(@Body() dto: LoginDto, @Res() res: Response) {
      const { accessToken, refreshToken } = await this.authService.login(dto);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,    // JavaScript 접근 차단
        secure: true,      // HTTPS에서만 전송
        sameSite: 'strict', // 크로스사이트 요청 시 전송 안 함
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        path: '/api/auth/refresh', // 토큰 갱신 경로에서만 전송
      });

      return res.json({ accessToken });
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 보안 속성 없이 쿠키 설정 - XSS, CSRF, 도청에 취약!
  res.cookie('refreshToken', refreshToken, {
    // httpOnly 미설정 → document.cookie로 토큰 탈취 가능
    // secure 미설정 → HTTP에서도 쿠키 전송
    // sameSite 미설정 → CSRF 공격에 취약
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  ```

### CSRF 방지

- **규칙**: [SHOULD] `SameSite` Cookie와 Bearer 토큰 기반 API는 별도 CSRF 토큰이 불필요하다.
- **규칙**: [MUST] Cookie 기반 세션 인증을 사용하는 경우 CSRF 토큰을 적용한다.
- **이유**: Bearer 토큰(Authorization 헤더)은 브라우저가 자동으로 전송하지 않으므로 CSRF에 면역이다. 반면 Cookie 기반 세션은 브라우저가 자동으로 Cookie를 전송하므로 CSRF 토큰으로 보호해야 한다.
- **좋은 예시**:
  ```typescript
  // Bearer 토큰 기반 API - CSRF 토큰 불필요
  // Authorization 헤더는 브라우저가 자동 전송하지 않음
  @UseGuards(JwtAuthGuard)
  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }
  ```
  ```java
  // Spring Security - Cookie 기반 세션 사용 시 CSRF 활성화
  @Configuration
  @EnableWebSecurity
  public class SecurityConfig {
      @Bean
      public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
          http
              // Cookie 기반 세션을 사용하므로 CSRF 활성화
              .csrf(csrf -> csrf
                  .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
              )
              .sessionManagement(session -> session
                  .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
              );
          return http.build();
      }
  }
  ```
- **나쁜 예시**:
  ```java
  // Cookie 기반 세션을 사용하면서 CSRF를 비활성화 - CSRF 공격에 취약!
  http
      .csrf(csrf -> csrf.disable()) // 세션 기반 인증에서 CSRF 비활성화는 위험!
      .sessionManagement(session -> session
          .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
      );
  ```

## 민감 데이터 관리

### 시크릿/환경변수 관리

- **규칙**: [MUST] DB 비밀번호, API Key, JWT Secret 등을 소스 코드에 하드코딩하지 않는다.
- **규칙**: [MUST] `.env` 파일을 `.gitignore`에 포함한다.
- **규칙**: [SHOULD] 운영 환경에서는 AWS Secrets Manager, HashiCorp Vault 등 시크릿 관리 도구를 사용한다.
- **이유**: 소스 코드에 포함된 시크릿은 Git 히스토리에 영구적으로 남아, 리포지토리가 유출되면 모든 시크릿이 노출된다. 환경변수나 시크릿 관리 도구를 사용하면 코드와 시크릿을 분리하여 안전하게 관리할 수 있다.
- **좋은 예시**:
  ```typescript
  // NestJS - ConfigModule로 환경변수 사용
  // app.module.ts
  import { ConfigModule, ConfigService } from '@nestjs/config';

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      }),
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
  ```yaml
  # .env.production (서버에만 존재, Git에 커밋하지 않음)
  DATABASE_URL=postgresql://user:password@host:5432/db
  JWT_SECRET=super-secret-key-from-vault
  AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
  ```
  ```java
  // Spring - Profile별 설정 파일 사용
  // application-production.yml (Git에 커밋하지 않음)
  // 또는 환경변수, Spring Cloud Config, AWS Secrets Manager 사용
  // 자세한 내용은 Spring 컨벤션 참조
  ```
  ```gitignore
  # .gitignore
  .env
  .env.*
  !.env.example
  ```
- **나쁜 예시**:
  ```typescript
  // 소스 코드에 시크릿 하드코딩 - 절대 금지!
  @Module({
    imports: [
      JwtModule.register({
        secret: 'my-super-secret-jwt-key-123', // Git 히스토리에 영구 기록됨!
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: 'production-db.example.com',
        username: 'admin',
        password: 'P@ssw0rd!',  // DB 비밀번호 하드코딩!
      }),
    ],
  })
  export class AppModule {}
  ```

### 민감 데이터 로깅 금지

- **규칙**: [MUST NOT] 로그에 비밀번호, 토큰, 신용카드 번호, 주민등록번호 등 민감 정보를 출력하지 않는다.
- **규칙**: [SHOULD] 민감 데이터를 로그에 포함해야 하는 경우 마스킹 처리한다.
- **이유**: 로그는 모니터링 시스템, 로그 수집 도구 등 여러 시스템을 거치며 장기간 보관된다. 로그에 포함된 민감 정보는 접근 권한이 있는 모든 인원에게 노출되며, 로그 시스템이 침해되면 대량의 민감 정보가 유출된다.

| 데이터 | 마스킹 예시 |
|--------|------------|
| 이메일 | `u***@example.com` |
| 전화번호 | `010-****-5678` |
| 신용카드 번호 | `****-****-****-1234` |
| 주민등록번호 | `900101-*******` |

- **좋은 예시**:
  ```typescript
  // 마스킹 유틸리티 함수
  export class MaskingUtil {
    static maskEmail(email: string): string {
      const [local, domain] = email.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }

    static maskPhone(phone: string): string {
      return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
    }

    static maskCardNumber(cardNumber: string): string {
      return cardNumber.replace(/(\d{4})-(\d{4})-(\d{4})-(\d{4})/, '****-****-****-$4');
    }
  }

  // 로그 출력 시 마스킹 적용
  this.logger.log(`주문 처리 완료: userId=${userId}, email=${MaskingUtil.maskEmail(email)}`);
  // 출력: 주문 처리 완료: userId=123, email=u***@example.com
  ```
- **나쁜 예시**:
  ```typescript
  // 요청 본문 전체를 로깅 - 비밀번호, 카드번호 등 민감 정보 노출!
  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    this.logger.log(`사용자 생성 요청: ${JSON.stringify(dto)}`);
    // 출력: 사용자 생성 요청: {"email":"user@example.com","password":"P@ss123!","phone":"010-1234-5678"}
    return this.userService.create(dto);
  }

  // 인증 토큰을 로깅 - 토큰 탈취 위험!
  this.logger.log(`인증 성공: token=${accessToken}`);
  ```

### API 응답에서 민감 정보 제외

- **규칙**: [MUST] ResponseDto를 통해 노출할 필드를 명시적으로 선택한다 (화이트리스트 방식).
- **규칙**: [MUST NOT] Entity를 API 응답으로 직접 반환하지 않는다.
- **이유**: Entity에는 비밀번호 해시, 내부 ID, 소프트 삭제 플래그 등 API 사용자에게 노출하면 안 되는 필드가 포함되어 있다. Entity를 직접 반환하면 새 필드가 추가될 때 자동으로 응답에 노출되는 위험이 있다.

> 민감 정보 응답 노출에 대한 자세한 안티패턴은 [API Spec 컨벤션](../api-spec/API_SPEC_CONVENTION.md)을 참조한다.

- **좋은 예시**:
  ```typescript
  // NestJS - @Exclude() 데코레이터 + class-transformer
  import { Exclude, Expose } from 'class-transformer';
  import { plainToInstance } from 'class-transformer';

  // Entity에서 민감 필드 제외
  @Entity()
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    email: string;

    @Column()
    @Exclude() // API 응답에서 제외
    password: string;

    @Column()
    @Exclude() // API 응답에서 제외
    refreshToken: string;
  }

  // ResponseDto로 노출 필드를 명시적으로 선택 (화이트리스트)
  export class UserResponseDto {
    @Expose()
    id: string;

    @Expose()
    email: string;

    @Expose()
    nickname: string;

    // password, refreshToken 등은 포함하지 않음
  }

  // Service에서 변환
  @Injectable()
  export class UserService {
    async getUser(id: string): Promise<UserResponseDto> {
      const user = await this.userRepository.findOneBy({ id });
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true, // @Expose()가 없는 필드 제외
      });
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Entity를 직접 반환 - password, 내부 필드가 응답에 포함됨!
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.userRepository.findOneBy({ id });
    // 응답: { id, email, password: "$2b$12$...", refreshToken: "eyJ...", deletedAt: null, ... }
  }
  ```

### 암호화

- **규칙**: [MUST] 비밀번호는 bcrypt로 단방향 해싱한다.
- **이유**: 단방향 해시는 원본을 복원할 수 없어, 데이터베이스가 유출되더라도 비밀번호가 안전하다.

> 비밀번호 해싱의 구체적인 구현은 [인증/인가 섹션의 비밀번호 처리](#비밀번호-처리)를 참조한다.

- **규칙**: [SHOULD] 민감 개인정보(주민번호, 카드번호 등)는 저장 시 AES-256 등으로 암호화한다.
- **이유**: 데이터베이스가 유출되더라도 암호화된 데이터는 복호화 키 없이 원본을 확인할 수 없다. 개인정보보호법에서도 민감 정보의 암호화 저장을 요구한다.
- **규칙**: [MUST] 암호화 키는 소스 코드에 포함하지 않고, 시크릿 관리 도구로 관리한다.
- **이유**: 암호화 키가 소스 코드에 포함되면 암호화의 의미가 없다.
- **좋은 예시**:
  ```typescript
  import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

  @Injectable()
  export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;

    constructor(private configService: ConfigService) {
      // 암호화 키는 환경변수/시크릿 관리 도구에서 로드
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
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(dataHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encrypted) + decipher.final('utf8');
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 암호화 키를 소스 코드에 하드코딩 - 암호화의 의미가 없음!
  const ENCRYPTION_KEY = 'my-secret-encryption-key-12345'; // Git에 커밋됨!

  function encrypt(text: string): string {
    const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    // ...
  }
  ```

### PII(개인식별정보) 처리

- **규칙**: [MUST] 개인정보는 수집 목적 달성 후 지체 없이 파기하거나 비식별화한다.
- **이유**: 개인정보보호법에 따라 목적 달성 후 개인정보를 지체 없이 파기해야 하며, 불필요한 개인정보 보유는 유출 시 피해 범위를 확대한다.
- **규칙**: [SHOULD] 개인정보 처리 시 접근 로그를 기록한다.
- **이유**: 개인정보 접근 이력을 남겨야 감사(audit) 및 침해 사고 조사 시 추적이 가능하다.
- **규칙**: [SHOULD] 개인정보 DB 컬럼은 암호화하거나 별도 테이블로 분리한다.
- **이유**: 개인정보를 별도 테이블로 분리하면 접근 제어를 강화할 수 있고, 개인정보 파기 시 해당 테이블만 처리하면 되어 관리가 용이하다.
- **좋은 예시**:
  ```typescript
  // 개인정보를 별도 테이블로 분리하고 접근 로그 기록
  @Entity()
  export class UserPersonalInfo {
    @PrimaryColumn()
    userId: string;

    @Column({ type: 'varchar', transformer: encryptTransformer }) // 암호화 저장
    residentNumber: string;

    @Column({ type: 'varchar', transformer: encryptTransformer }) // 암호화 저장
    phoneNumber: string;

    @Column({ type: 'timestamp', nullable: true })
    retentionExpiry: Date; // 보유 기한 - 기한 만료 시 자동 파기
  }

  @Injectable()
  export class PersonalInfoService {
    constructor(
      private readonly personalInfoRepo: Repository<UserPersonalInfo>,
      private readonly auditLogger: AuditLogService,
    ) {}

    async getPersonalInfo(userId: string, requesterId: string): Promise<UserPersonalInfo> {
      // 접근 로그 기록
      await this.auditLogger.log({
        action: 'READ_PERSONAL_INFO',
        targetUserId: userId,
        requesterId,
        timestamp: new Date(),
      });

      return this.personalInfoRepo.findOneBy({ userId });
    }

    // 보유 기한 만료된 개인정보 파기
    async purgeExpiredPersonalInfo(): Promise<void> {
      await this.personalInfoRepo.delete({
        retentionExpiry: LessThan(new Date()),
      });
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 개인정보를 일반 테이블에 평문 저장, 접근 로그 없음
  @Entity()
  export class User {
    @Column()
    email: string;

    @Column()
    residentNumber: string; // 주민등록번호 평문 저장!

    @Column()
    creditCardNumber: string; // 카드번호 평문 저장!

    // 보유 기한 없음, 파기 정책 없음
  }
  ```

## 의존성 및 공급망 보안

### 의존성 보안 스캐닝

- **규칙**: [MUST] CI 파이프라인에서 의존성 취약점 스캐닝을 자동화한다 (`npm audit`, `yarn audit`).
- **규칙**: [SHOULD] Snyk, Dependabot, Renovate 등 자동 취약점 감지 도구를 사용한다.
- **이유**: 알려진 취약점이 있는 라이브러리가 프로덕션에 배포되는 것을 방지한다. 수동 점검만으로는 수백 개의 의존성을 추적하기 어렵다.
- **좋은 예시**:
  ```yaml
  # GitHub Actions CI - 의존성 취약점 스캐닝
  name: Security Audit
  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]
    schedule:
      - cron: '0 9 * * 1' # 매주 월요일 09:00 UTC

  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4

        - name: Install dependencies
          run: npm ci

        - name: Run npm audit
          run: npm audit --audit-level=high
          # high 이상의 취약점이 발견되면 CI 실패

        - name: Run Snyk security scan
          uses: snyk/actions/node@master
          env:
            SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  ```
- **나쁜 예시**:
  ```yaml
  # 보안 스캐닝 없이 빌드만 수행
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: npm install  # npm ci 대신 npm install 사용
        - run: npm run build
        # npm audit 없음 - 취약한 의존성이 그대로 배포됨
  ```

### 락파일 관리

- **규칙**: [MUST] `package-lock.json` 또는 `yarn.lock`을 반드시 커밋한다.
- **규칙**: [MUST NOT] `.gitignore`에 락파일을 포함하지 않는다.
- **이유**: 락파일 없이 설치하면 의존성 버전이 달라져 재현 불가능한 빌드와 보안 취약점 유입이 가능하다. 락파일은 정확한 버전을 고정하여 일관된 빌드 환경을 보장한다.
- **좋은 예시**:
  ```gitignore
  # .gitignore - 락파일은 포함하지 않음
  node_modules/
  dist/
  .env
  .env.*
  !.env.example
  ```
  ```bash
  # CI에서 반드시 npm ci 사용 (락파일 기반 설치)
  npm ci
  ```
- **나쁜 예시**:
  ```gitignore
  # .gitignore - 락파일을 무시하면 안 됨!
  node_modules/
  package-lock.json  # 락파일이 Git에서 제외됨!
  yarn.lock          # 의존성 버전이 환경마다 달라짐!
  ```

### 서드파티 라이브러리 선택 기준

- **규칙**: [SHOULD] 라이브러리 선택 시 아래 기준을 고려한다.
- **이유**: 유지보수가 중단된 라이브러리나 알려진 취약점이 있는 라이브러리는 프로젝트 전체의 보안을 위협한다.

| 기준 | 확인 항목 |
|------|----------|
| 유지보수 상태 | 마지막 업데이트가 6개월 이내인지 확인 |
| 보안 취약점 | Snyk, npm audit에서 알려진 취약점이 없는지 확인 |
| 커뮤니티 규모 | 주간 다운로드 수, GitHub 스타 수, 이슈 응답 속도 |
| 라이선스 호환성 | MIT, Apache 2.0 등 상용 프로젝트와 호환되는 라이선스인지 확인 |

## 요청 제한 및 서비스 보호

### 요청 본문 크기 제한

- **규칙**: [MUST] API 서버에 요청 본문 최대 크기를 설정한다.
- **이유**: 무제한 요청 크기는 메모리 고갈(DoS) 공격에 취약하다. 공격자가 수 GB 크기의 요청을 보내면 서버 메모리가 고갈되어 서비스가 중단된다.
- **좋은 예시**:
  ```typescript
  // NestJS - main.ts에서 요청 본문 크기 제한
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // JSON 요청 본문 크기 제한 (기본값: 100kb)
    app.use(express.json({ limit: '1mb' }));

    // URL-encoded 요청 본문 크기 제한
    app.use(express.urlencoded({ limit: '1mb', extended: true }));

    await app.listen(3000);
  }
  bootstrap();
  ```
  ```yaml
  # Spring - application.yml
  server:
    tomcat:
      max-http-form-post-size: 1MB
      max-swallow-size: 1MB
  spring:
    servlet:
      multipart:
        max-file-size: 10MB
        max-request-size: 10MB
  ```
- **나쁜 예시**:
  ```typescript
  // 요청 크기 제한 없음 - DoS 공격에 취약
  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(express.json({ limit: '50mb' })); // 너무 큰 제한!
    await app.listen(3000);
  }
  ```

### Rate Limiting

> Rate Limiting 규칙은 [API Spec 컨벤션](../api-spec/API_SPEC_CONVENTION.md)에서 정의한다.
> API 엔드포인트별 요청 제한, 응답 헤더(`X-RateLimit-*`), 429 Too Many Requests 처리 등의 상세 규칙을 참조한다.

### 요청 Timeout 설정

- **규칙**: [MUST] API 서버와 외부 API 호출에 적절한 Timeout을 설정한다.
- **이유**: 무한 대기는 커넥션 풀 고갈과 서비스 장애의 원인이 된다. 하나의 느린 외부 API가 전체 서비스의 응답 지연을 유발할 수 있다.

| 대상 | 권장 Timeout | 설명 |
|------|-------------|------|
| API 서버 응답 | 30초 | 클라이언트에 대한 최대 응답 시간 |
| 외부 API 호출 | 5~10초 | 외부 서비스 호출 시 최대 대기 시간 |
| DB 쿼리 | 5초 | 데이터베이스 쿼리 최대 실행 시간 |

- **좋은 예시**:
  ```typescript
  // NestJS - HttpService에 Timeout 설정
  import { HttpModule } from '@nestjs/axios';

  @Module({
    imports: [
      HttpModule.register({
        timeout: 5000,  // 외부 API 호출 5초 Timeout
        maxRedirects: 3,
      }),
    ],
  })
  export class ExternalApiModule {}
  ```
  ```typescript
  // 개별 요청에 Timeout 설정
  import { HttpService } from '@nestjs/axios';
  import { firstValueFrom, timeout } from 'rxjs';

  @Injectable()
  export class PaymentService {
    constructor(private readonly httpService: HttpService) {}

    async processPayment(data: PaymentDto): Promise<PaymentResult> {
      const response = await firstValueFrom(
        this.httpService.post('https://pg.example.com/pay', data).pipe(
          timeout(10000), // 결제 API는 10초 Timeout
        ),
      );
      return response.data;
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Timeout 미설정 - 외부 API가 응답하지 않으면 무한 대기
  @Injectable()
  export class PaymentService {
    constructor(private readonly httpService: HttpService) {}

    async processPayment(data: PaymentDto): Promise<PaymentResult> {
      // Timeout 없음 - 외부 서버 장애 시 커넥션 풀 고갈
      const response = await firstValueFrom(
        this.httpService.post('https://pg.example.com/pay', data),
      );
      return response.data;
    }
  }
  ```

### Slowloris/DDoS 기본 방어

- **규칙**: [SHOULD] 리버스 프록시(Nginx, CloudFront 등)에서 연결 수 제한, 요청 속도 제한을 설정한다.
- **규칙**: [SHOULD] 클라우드 환경에서는 WAF(Web Application Firewall)를 활용한다.
- **이유**: 애플리케이션 레벨 방어만으로는 인프라 레벨 공격을 막을 수 없다. Slowloris 공격은 HTTP 연결을 천천히 유지하여 서버의 동시 연결 수를 소진시키며, DDoS 공격은 대량의 트래픽으로 서비스를 마비시킨다.
- **좋은 예시**:
  ```nginx
  # Nginx - 연결 수 제한 및 요청 속도 제한
  http {
      # 클라이언트 IP당 동시 연결 수 제한
      limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
      limit_conn conn_limit 10;

      # 클라이언트 IP당 요청 속도 제한 (초당 10개)
      limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;

      server {
          location /api/ {
              limit_req zone=req_limit burst=20 nodelay;

              # Slowloris 방어: 느린 클라이언트 연결 제한
              client_body_timeout 10s;
              client_header_timeout 10s;
              keepalive_timeout 15s;
              send_timeout 10s;
          }
      }
  }
  ```

## 보안 로깅 및 감사

### 감사 로그 필수 이벤트

- **규칙**: [MUST] 아래 보안 관련 이벤트는 반드시 감사 로그로 기록한다.
- **이유**: 감사 로그는 보안 사고 발생 시 원인 분석과 책임 추적의 핵심 근거가 된다. 로그가 없으면 침해 사실 자체를 인지할 수 없다.

| 이벤트 | 로그 내용 |
|--------|----------|
| 로그인 성공/실패 | 사용자 ID, IP 주소, User-Agent, 시각, 성공/실패 여부 |
| 비밀번호 변경 | 사용자 ID, 변경 시각, 변경 요청 IP |
| 권한 변경 | 대상 사용자 ID, 변경 전/후 권한, 변경자 ID, 시각 |
| 데이터 삭제 | 삭제 대상(테이블, ID), 삭제자 ID, 시각 |
| 민감 데이터 조회 | 조회자 ID, 조회 대상, 시각, IP 주소 |
| API Key 생성/삭제 | 대상 Key(마스킹), 생성/삭제자 ID, 시각 |

- **좋은 예시**:
  ```typescript
  // 감사 로그 인터페이스
  interface AuditLog {
    /** 감사 이벤트 유형 */
    eventType:
      | 'LOGIN_SUCCESS'
      | 'LOGIN_FAILURE'
      | 'PASSWORD_CHANGE'
      | 'PERMISSION_CHANGE'
      | 'DATA_DELETE'
      | 'SENSITIVE_DATA_ACCESS'
      | 'API_KEY_CREATE'
      | 'API_KEY_DELETE';
    /** 행위자 사용자 ID */
    userId: string;
    /** 요청 IP 주소 */
    ipAddress: string;
    /** User-Agent */
    userAgent?: string;
    /** 대상 리소스 (예: 'user:123', 'order:456') */
    targetResource?: string;
    /** 이전 값 (변경 이벤트) */
    previousValue?: string;
    /** 새 값 (변경 이벤트) */
    newValue?: string;
    /** 이벤트 발생 시각 */
    timestamp: Date;
    /** 추가 메타데이터 */
    metadata?: Record<string, unknown>;
  }
  ```
  ```typescript
  // NestJS - 감사 로그 서비스
  import { Injectable, Logger } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';

  @Injectable()
  export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(
      @InjectRepository(AuditLogEntity)
      private readonly auditLogRepository: Repository<AuditLogEntity>,
    ) {}

    async log(auditLog: AuditLog): Promise<void> {
      // DB에 감사 로그 저장
      await this.auditLogRepository.save({
        ...auditLog,
        timestamp: auditLog.timestamp ?? new Date(),
      });

      // 구조화된 로그 출력 (로그 수집 시스템 연동)
      this.logger.log({
        message: `Audit: ${auditLog.eventType}`,
        ...auditLog,
      });
    }
  }
  ```
  ```typescript
  // 사용 예시 - 로그인 시 감사 로그 기록
  @Injectable()
  export class AuthService {
    constructor(
      private readonly auditLogService: AuditLogService,
    ) {}

    async login(dto: LoginDto, req: Request): Promise<TokenPair> {
      const user = await this.validateUser(dto.email, dto.password);

      if (!user) {
        await this.auditLogService.log({
          eventType: 'LOGIN_FAILURE',
          userId: dto.email, // 실패 시 입력된 이메일 기록
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      await this.auditLogService.log({
        eventType: 'LOGIN_SUCCESS',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });

      return this.generateTokenPair(user);
    }
  }
  ```

### 로그에 민감 정보 포함 금지

> 로그에 민감 정보를 포함하지 않는 규칙은 [민감 데이터 로깅 금지](#민감-데이터-로깅-금지) 섹션을 참조한다.
> 마스킹 처리 기준과 예시를 확인한다.

### 보안 이벤트 모니터링

- **규칙**: [SHOULD] 연속 로그인 실패(5회 이상), 비정상 접근 패턴 등을 실시간으로 모니터링하고 알림을 발생시킨다.
- **규칙**: [SHOULD] 계정 잠금 정책을 적용한다: 연속 N회 로그인 실패 시 일정 시간 계정을 잠금한다.
- **이유**: 무차별 대입 공격(brute force)을 조기에 감지하고 차단한다. 모니터링 없이는 공격이 성공할 때까지 인지할 수 없다.
- **좋은 예시**:
  ```typescript
  // NestJS - 연속 로그인 실패 감지 및 계정 잠금
  @Injectable()
  export class LoginAttemptService {
    // 캐시(Redis 등)에 실패 횟수 관리
    constructor(
      @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
      private readonly auditLogService: AuditLogService,
    ) {}

    private getKey(userId: string): string {
      return `login_attempts:${userId}`;
    }

    async recordFailure(userId: string, ip: string): Promise<void> {
      const key = this.getKey(userId);
      const attempts = ((await this.cacheManager.get<number>(key)) ?? 0) + 1;

      // TTL 30분 - 30분 후 자동 초기화
      await this.cacheManager.set(key, attempts, 30 * 60 * 1000);

      if (attempts >= 5) {
        // 5회 이상 실패 시 알림 발생
        await this.auditLogService.log({
          eventType: 'LOGIN_FAILURE',
          userId,
          ipAddress: ip,
          timestamp: new Date(),
          metadata: {
            consecutiveFailures: attempts,
            alert: 'BRUTE_FORCE_SUSPECTED',
          },
        });
      }
    }

    async isLocked(userId: string): Promise<boolean> {
      const attempts =
        (await this.cacheManager.get<number>(this.getKey(userId))) ?? 0;
      return attempts >= 5; // 5회 이상 실패 시 잠금
    }

    async resetAttempts(userId: string): Promise<void> {
      await this.cacheManager.del(this.getKey(userId));
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 로그인 실패 횟수를 추적하지 않음 - 무차별 대입 공격 감지 불가
  @Injectable()
  export class AuthService {
    async login(dto: LoginDto): Promise<TokenPair> {
      const user = await this.validateUser(dto.email, dto.password);
      if (!user) {
        // 실패 로그 없음, 실패 횟수 추적 없음
        throw new UnauthorizedException('Invalid credentials');
      }
      return this.generateTokenPair(user);
    }
  }
  ```

## 보안 테스트

### OWASP Top 10 기반 보안 체크리스트

- **규칙**: [SHOULD] 코드 리뷰 시 아래 OWASP Top 10 항목을 체크한다.
- **이유**: OWASP Top 10은 가장 흔하고 위험한 웹 애플리케이션 보안 취약점 목록으로, 체계적인 보안 검토의 기준이 된다.

| 순위 | 취약점 | 확인 항목 |
|------|--------|----------|
| A01 | Broken Access Control | 인증/인가 Guard 적용 여부, 리소스 소유자 검증 |
| A02 | Cryptographic Failures | 민감 데이터 암호화, HTTPS 강제, 안전한 해시 알고리즘 사용 |
| A03 | Injection | SQL 파라미터 바인딩, 입력 검증(DTO), XSS 필터링 |
| A04 | Insecure Design | 비즈니스 로직 보안, 위협 모델링 반영 여부 |
| A05 | Security Misconfiguration | 기본 설정 변경 여부, 불필요한 기능/포트 비활성화 |
| A06 | Vulnerable Components | 의존성 취약점 스캐닝, 라이브러리 업데이트 |
| A07 | Identification and Authentication Failures | JWT 만료 설정, 비밀번호 정책, Refresh Token Rotation |
| A08 | Software and Data Integrity Failures | CI/CD 파이프라인 보안, 의존성 무결성 검증 |
| A09 | Security Logging and Monitoring Failures | 감사 로그 기록, 보안 이벤트 모니터링 |
| A10 | Server-Side Request Forgery (SSRF) | 외부 URL 입력 검증, 내부 네트워크 접근 차단 |

### 정적 분석 도구

- **규칙**: [SHOULD] ESLint 보안 플러그인(`eslint-plugin-security`)을 사용한다.
- **규칙**: [MAY] SonarQube 등 정적 분석 도구를 CI에 통합한다.
- **이유**: 정적 분석은 코드 리뷰에서 놓치기 쉬운 보안 취약점을 자동으로 감지한다.
- **좋은 예시**:
  ```javascript
  // .eslintrc.js - 보안 플러그인 설정
  module.exports = {
    plugins: ['security'],
    extends: [
      'plugin:security/recommended-legacy',
    ],
    rules: {
      // eval() 사용 감지
      'security/detect-eval-with-expression': 'error',
      // 안전하지 않은 정규표현식 감지 (ReDoS)
      'security/detect-unsafe-regex': 'error',
      // 하드코딩된 비밀번호/시크릿 감지
      'security/detect-possible-timing-attacks': 'warn',
      // 동적 require 감지
      'security/detect-non-literal-require': 'warn',
    },
  };
  ```
- **나쁜 예시**:
  ```javascript
  // .eslintrc.js - 보안 플러그인 없음
  module.exports = {
    extends: ['eslint:recommended'],
    // security 플러그인 미사용 - 보안 취약점 자동 감지 불가
  };
  ```

### 의존성 취약점 CI 자동 검사

> 의존성 취약점 자동 검사 규칙은 [의존성 보안 스캐닝](#의존성-보안-스캐닝) 섹션을 참조한다.
> CI 파이프라인 설정 예시와 도구 추천을 확인한다.

### 침투 테스트

- **규칙**: [SHOULD] 주요 릴리스 전 침투 테스트를 수행한다.
- **규칙**: [MAY] OWASP ZAP 등 자동화 도구로 기본 스캐닝을 수행한다.
- **이유**: 자동화된 스캐닝과 코드 리뷰만으로는 발견할 수 없는 복합적인 취약점을 침투 테스트로 발견할 수 있다.
- **좋은 예시**:
  ```bash
  # OWASP ZAP - Docker를 활용한 자동화 스캐닝
  # 스테이징 환경에서 실행
  docker run -t zaproxy/zap-stable zap-baseline.py \
    -t https://staging.example.com \
    -r zap-report.html

  # 전체 스캔 (더 깊은 분석)
  docker run -t zaproxy/zap-stable zap-full-scan.py \
    -t https://staging.example.com \
    -r zap-full-report.html
  ```

## 안티패턴

### 1. 하드코딩된 시크릿

- **설명**: 소스 코드에 비밀번호, API Key, JWT Secret 등을 직접 작성하는 패턴이다.
- **징후**:
  - 소스 코드에 `password`, `secret`, `api_key` 등의 문자열 리터럴이 포함됨
  - `.env` 파일이 `.gitignore`에 없음
  - `ConfigService` 없이 설정값을 직접 사용
- **나쁜 예시**:
  ```typescript
  // 시크릿이 소스 코드에 하드코딩됨
  const jwtSecret = 'my-super-secret-key-2024';
  const dbPassword = 'P@ssw0rd!';
  const apiKey = 'sk-1234567890abcdef';

  @Module({
    imports: [
      JwtModule.register({
        secret: jwtSecret, // Git 히스토리에 영구 기록
      }),
    ],
  })
  export class AuthModule {}
  ```
- **해결 방법**: 환경변수 또는 시크릿 관리 도구를 사용한다. 자세한 내용은 [시크릿/환경변수 관리](#시크릿환경변수-관리) 섹션을 참조한다.

### 2. 에러 응답에 스택 트레이스 노출

- **설명**: 운영(production) 환경에서 에러 발생 시 내부 스택 트레이스, 파일 경로, DB 쿼리 등을 클라이언트에 노출하는 패턴이다.
- **징후**:
  - 에러 응답에 `stack`, `trace` 필드가 포함됨
  - SQL 쿼리, 파일 시스템 경로가 에러 메시지에 노출됨
  - 운영 환경에서 `NODE_ENV`가 `development`로 설정됨
- **나쁜 예시**:
  ```typescript
  // 에러 필터 없이 기본 에러 응답 - 내부 정보 노출
  @Get(':id')
  async getUser(@Param('id') id: string) {
    try {
      return await this.userService.findById(id);
    } catch (error) {
      // 스택 트레이스가 클라이언트에 그대로 노출됨!
      throw new HttpException(
        {
          message: error.message,
          stack: error.stack,        // 파일 경로, 라인 번호 노출
          query: error.query,        // SQL 쿼리 노출
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  ```
- **해결 방법**: 전역 Exception Filter를 사용하여 운영 환경에서는 안전한 에러 메시지만 반환한다. 자세한 내용은 [API 응답에서 민감 정보 제외](#api-응답에서-민감-정보-제외) 섹션을 참조한다.

### 3. CORS 와일드카드 허용

- **설명**: CORS 설정에서 `origin: '*'`를 사용하여 모든 도메인에서의 요청을 허용하는 패턴이다.
- **징후**:
  - `origin: '*'` 또는 `origin: true` 설정
  - `credentials: true`와 와일드카드 origin을 동시에 사용하려는 시도
- **나쁜 예시**:
  ```typescript
  // 모든 도메인 허용 - CSRF 공격에 취약
  app.enableCors({
    origin: '*',
    credentials: true, // 와일드카드와 함께 사용 불가 (브라우저 차단)
  });
  ```
- **해결 방법**: 허용된 도메인을 명시적으로 나열한다. 자세한 내용은 [CORS 설정](#cors-설정) 섹션을 참조한다.

### 4. 사용자 입력 무검증 신뢰

- **설명**: DTO 검증 없이 사용자 입력값을 그대로 비즈니스 로직이나 DB 쿼리에 사용하는 패턴이다.
- **징후**:
  - `class-validator` 데코레이터가 없는 DTO
  - `ValidationPipe`가 전역 또는 컨트롤러에 적용되지 않음
  - `@Body()`, `@Query()`, `@Param()` 값을 검증 없이 직접 사용
- **나쁜 예시**:
  ```typescript
  // DTO 검증 없이 입력값 직접 사용 - Injection 공격에 취약
  @Post('users')
  async createUser(@Body() body: any) {
    // body의 타입, 범위, 형식을 전혀 검증하지 않음
    return this.userService.create(body);
  }

  // 나쁜 DTO - 검증 데코레이터 없음
  class CreateUserDto {
    email: string;    // @IsEmail() 없음
    name: string;     // @IsString(), @Length() 없음
    age: number;      // @IsInt(), @Min() 없음
  }
  ```
- **해결 방법**: `class-validator`와 `ValidationPipe`를 사용하여 모든 입력을 검증한다. 자세한 내용은 [입력 검증 원칙](#입력-검증-원칙) 섹션을 참조한다.

### 5. 민감 데이터 평문 저장/전송

- **설명**: 비밀번호, 개인정보 등을 암호화 없이 평문으로 저장하거나 전송하는 패턴이다.
- **징후**:
  - 비밀번호를 `bcrypt` 등으로 해싱하지 않고 DB에 저장
  - 주민등록번호, 카드번호 등을 암호화 없이 일반 컬럼에 저장
  - HTTP(비암호화) 프로토콜로 민감 데이터 전송
- **나쁜 예시**:
  ```typescript
  // 비밀번호 평문 저장 - DB 유출 시 모든 계정 침해
  @Injectable()
  export class UserService {
    async createUser(dto: CreateUserDto): Promise<User> {
      const user = this.userRepository.create({
        email: dto.email,
        password: dto.password, // 평문 저장!
      });
      return this.userRepository.save(user);
    }

    async validateUser(email: string, password: string): Promise<User> {
      const user = await this.userRepository.findOne({ where: { email } });
      if (user.password === password) { // 평문 비교!
        return user;
      }
      return null;
    }
  }
  ```
- **해결 방법**: 비밀번호는 `bcrypt`로 해싱하고, 민감 데이터는 AES-256 등으로 암호화한다. 자세한 내용은 [비밀번호 처리](#비밀번호-처리) 및 [암호화](#암호화) 섹션을 참조한다.

### 6. 무기한 JWT 만료

- **설명**: JWT의 `expiresIn`을 설정하지 않거나 과도하게 긴 만료 시간(예: 1년)을 설정하는 패턴이다.
- **징후**:
  - `JwtModule.register()`에 `expiresIn` 미설정
  - Access Token 만료 시간이 24시간 이상
  - Refresh Token 없이 긴 만료의 Access Token만 사용
- **나쁜 예시**:
  ```typescript
  // 만료 시간 미설정 또는 과도하게 긴 만료 시간
  JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: {
      // expiresIn 미설정 - 토큰이 영원히 유효!
    },
  });

  // 또는
  JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: '365d', // 1년 만료 - 토큰 탈취 시 장기간 악용 가능
    },
  });
  ```
- **해결 방법**: Access Token은 15분~1시간, Refresh Token은 7일~30일로 설정한다. 자세한 내용은 [JWT 토큰 관리](#jwt-토큰-관리) 섹션을 참조한다.

## 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CORS Misconfiguration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP ZAP](https://www.zaproxy.org/)
- [RFC 6750 - Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
- [JWT Best Practices (RFC 8725)](https://www.rfc-editor.org/rfc/rfc8725)
- [Helmet.js](https://helmetjs.github.io/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Spring Security Reference](https://docs.spring.io/spring-security/reference/)
- [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)
- [Snyk](https://snyk.io/)
- [sanitize-html](https://github.com/apostrophecms/sanitize-html)
