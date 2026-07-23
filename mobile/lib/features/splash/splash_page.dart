import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_theme.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeLogo;
  late Animation<double> _scaleLogo;
  late Animation<double> _fadeText;
  late Animation<double> _fadeSlogan;
  late Animation<double> _fadeButton;
  late Animation<double> _positionSlogan;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3500),
    );

    _fadeLogo = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.3, curve: Curves.easeIn)),
    );
    _scaleLogo = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.3, curve: Curves.elasticOut)),
    );
    _fadeText = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.3, 0.5, curve: Curves.easeIn)),
    );
    _fadeSlogan = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.5, 0.7, curve: Curves.easeIn)),
    );
    _positionSlogan = Tween<double>(begin: 20.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.5, 0.7, curve: Curves.easeOut)),
    );
    _fadeButton = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.7, 1.0, curve: Curves.easeIn)),
    );

    _controller.forward();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      context.go('/dashboard');
    } else {
      context.go('/login');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _goToLogin() {
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF1B5E20),
              Color(0xFF2E7D32),
              Color(0xFF43A047),
              Color(0xFF66BB6A),
            ],
            stops: [0.0, 0.3, 0.6, 1.0],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: -80,
                right: -80,
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.05),
                  ),
                ),
              ),
              Positioned(
                bottom: 120,
                left: -60,
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.05),
                  ),
                ),
              ),
              Positioned(
                top: 200,
                right: -40,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.05),
                  ),
                ),
              ),

              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(flex: 2),

                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      return Opacity(
                        opacity: _fadeLogo.value,
                        child: Transform.scale(
                          scale: _scaleLogo.value,
                          child: child,
                        ),
                      );
                    },
                    child: Container(
                      width: 150,
                      height: 150,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.25),
                            blurRadius: 30,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Center(
                            child: Transform.scale(
                              scale: 1.2,
                              child: Image.asset(
                                'assets/logo.jpeg',
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) => Icon(
                                  Icons.store_mall_directory_rounded,
                                  size: 80,
                                  color: AppTheme.primaryGreen,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      return Opacity(
                        opacity: _fadeText.value,
                        child: child,
                      );
                    },
                    child: const Text(
                      'SiAga Officer',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      return Opacity(
                        opacity: _fadeSlogan.value,
                        child: Transform.translate(
                          offset: Offset(0, _positionSlogan.value),
                          child: child,
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: const Text(
                        '✧ Retribusi Pasar Digital ✧',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 50),

                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      return Opacity(
                        opacity: _fadeButton.value,
                        child: child,
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40),
                      child: ElevatedButton(
                        onPressed: _goToLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF1B5E20),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          elevation: 5,
                          shadowColor: Colors.black.withOpacity(0.3),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Mulai Sekarang',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1,
                              ),
                            ),
                            SizedBox(width: 12),
                            Icon(Icons.arrow_forward_rounded, size: 22),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const Spacer(flex: 1),

                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      return Opacity(
                        opacity: _fadeButton.value * 0.6,
                        child: child,
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 30),
                      child: const Text(
                        'v1.0.0 · Perumda Pasar Karya Makassar',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginNavigator extends StatelessWidget {
  const _LoginNavigator();

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.go('/login');
    });
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}