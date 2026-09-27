Pod::Spec.new do |s|
  s.name = 'PayslipOcr'
  s.version = '0.1.0'
  s.summary = 'Local Japanese payslip recognition and private storage preparation'
  s.description = 'On-device Vision OCR and backup-excluded database storage.'
  s.license = { :type => 'All rights reserved' }
  s.author = 'Payslip Navi'
  s.homepage = 'https://github.com/sakuma-dev/payslip-navi'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/sakuma-dev/payslip-navi.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'ImageIO'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
